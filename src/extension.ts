import { Buffer } from 'buffer';
import * as vscode from 'vscode';

/**
 * VS Code extension entry point
 */
export function activate(context: vscode.ExtensionContext) {
    // Register the command for the command palette
    const disposable = vscode.commands.registerCommand('vexana-model-generator.generateModel', async (uri: vscode.Uri) => {
        await generateModelFromJson(uri);
    });

    // Register the context menu command
    const contextDisposable = vscode.commands.registerCommand('vexana-model-generator.contextGenerateModel', async (uri: vscode.Uri) => {
        await generateModelFromJson(uri);
    });

    context.subscriptions.push(disposable, contextDisposable);

    // Register context menu for JSON files
    vscode.commands.executeCommand('setContext', 'vexana-model-generator.showContext', true);
}

async function generateModelFromJson(uri: vscode.Uri) {
    // Read file content
    const fileContent = (await vscode.workspace.fs.readFile(uri)).toString();

    try {
        // Get model name from the user
        const modelName = await vscode.window.showInputBox({
            prompt: 'Enter the model name',
            placeHolder: 'Response'
        });

        if (!modelName) {
            vscode.window.showErrorMessage('Model name is required.');
            return;
        }

        // Get user options for generation
        const options = await vscode.window.showQuickPick([
            { label: 'Add method copyWith', picked: true },
            { label: 'Use EquatableMixin', picked: false },
            { label: 'Use @JsonSerializable()', picked: true },
            { label: 'Use @freezed()', picked: false }
        ], {
            canPickMany: true,
            placeHolder: 'Select multiple options:'
        });

        if (!options || options.length === 0) {
            vscode.window.showErrorMessage('No options selected. Please select at least one option.');
            return;
        }

        // Set options flags
        const includeCopyWith = options.some(opt => opt.label.includes('copyWith'));
        const includeEquatableMixin = options.some(opt => opt.label.includes('EquatableMixin'));
        const includeJsonSerializable = options.some(opt => opt.label.includes('@JsonSerializable'));
        const includeFreezed = options.some(opt => opt.label.includes('@freezed'));

        // Generate the Dart model code
        const modelCode = generateDartModel(fileContent, modelName, {
            includeCopyWith,
            includeEquatableMixin,
            includeJsonSerializable,
            includeFreezed
        });

        // Create a new Dart file next to the JSON file
        const dartFileUri = vscode.Uri.joinPath(uri, `../${modelName.toLowerCase()}.dart`);
        const dartFileExists = await fileExists(dartFileUri);

        if (dartFileExists) {
            vscode.window.showWarningMessage(`File ${modelName.toLowerCase()}.dart already exists. Overwriting...`);
        }

        await vscode.workspace.fs.writeFile(dartFileUri, Buffer.from(modelCode));
        vscode.window.showInformationMessage(`Model file created: ${dartFileUri.fsPath}`);

        // Open the generated Dart file in the editor
        const document = await vscode.workspace.openTextDocument(dartFileUri);
        vscode.window.showTextDocument(document);
    } catch (error: any) {
        vscode.window.showErrorMessage(error.message || 'Invalid JSON file. Please provide a valid JSON.');
    }
}

/**
 * Asıl Dart kodunu üreten fonksiyon.
 * JSON string alır, parse eder, "class info"ları çıkarır ve tek bir .dart dosyası oluşturur.
 */
export function generateDartModel(jsonContent: string, modelName: string, options: { includeCopyWith: boolean, includeEquatableMixin: boolean, includeJsonSerializable: boolean, includeFreezed: boolean ,},): string {
    let jsonData: any;

    // 1) JSON parse et
    try {
        jsonData = JSON.parse(jsonContent);
    } catch {
        throw new Error('Invalid JSON');
    }

    // Eğer array ise ilk elemanı baz al
    if (Array.isArray(jsonData) && jsonData.length > 0) {
        jsonData = jsonData[0];
    }

    // Objeyle devam et
    if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) {
        throw new Error('Invalid JSON: top-level must be an object or non-empty array');
    }

    // 2) Tüm class bilgilerini (nested) bul
    const classes = parseJsonToClasses(jsonData, modelName);

    // 3) Tek .dart içinde tüm class’ları birleştir
    let code = '';

    if (options.includeJsonSerializable) {
        code += `import 'package:json_annotation/json_annotation.dart';\n`;
    }
    if (options.includeFreezed) {
        code += `import 'package:freezed_annotation/freezed_annotation.dart';\n`;
    }
    if (options.includeEquatableMixin) {
        code += `import 'package:equatable/equatable.dart';\n`;
    }

    code += `import 'package:vexana/vexana.dart';\n\n`;

    for (const cls of classes) {
        code += generateDartClass(cls, options);
    }

    return code.trim();
}

/**
 * Dart Sınıfını Oluşturur
 */
function generateDartClass(
    info: ClassInfo,
    options: { includeCopyWith: boolean; includeEquatableMixin: boolean; includeJsonSerializable: boolean; includeFreezed: boolean }
): string {
    const { className, fields } = info;

    const fieldLines = fields.map(f => `final ${f.typeName} ${f.name};`).join('\n  ');
    const constructorParams = fields.map(f => `${isNullable(f.typeName) ? '' : 'required '}this.${f.name},`).join('\n    ');
    const fromJsonMethod = generateFromJsonMethod(className, fields);
    const toJsonMethod = generateToJsonMethod(fields);
    const copyWithMethod = options.includeCopyWith ? generateCopyWithMethod(className, fields) : '';

    return `
${options.includeJsonSerializable ? '@JsonSerializable()' : ''}
${options.includeFreezed ? '@freezed' : ''}
class ${className} extends INetworkModel<${className}> ${options.includeEquatableMixin ? 'with EquatableMixin' : ''} {
  ${fieldLines}

  ${className}({
    ${constructorParams}
  });

  ${fromJsonMethod}
  ${toJsonMethod}
  ${copyWithMethod}
}`;
}
  
function generateFromJsonMethod(className: string, fields: FieldInfo[]): string {
    const fieldMappings = fields.map(f => {
        if (f.typeName.startsWith('List')) {
            const listType = removeBrackets(f.typeName);
            return `${f.name}: List<${listType}>.from(json['${f.name}'] as List<dynamic> ?? [])`;
        }else if (f.typeName.startsWith('Map')) {
            return `${f.name}: json['${f.name}'] != null
                ? Map<String, dynamic>.from(json['${f.name}'] as Map<String, dynamic>)
                : null`;
        } else if (isCustomType(removeQuestionMark(f.typeName))) {
            return `${f.name}: json['${f.name}'] != null
                ? ${removeQuestionMark(f.typeName)}.fromJson(json['${f.name}'] as Map<String, dynamic>)
                : null`;
        } else {
            return `${f.name}: json['${f.name}'] as ${removeQuestionMark(f.typeName)}${f.typeName.includes('?') ? ' ?? null' : ''}`;
        }
    }).join(',\n      ');

    return `
    @override
    ${className} fromJson(Map<String, dynamic> json) {
        return ${className}(
            ${fieldMappings}
        );
    }`;
}

function isCustomType(typeName: string): boolean {
    const primitiveTypes = ['int', 'double', 'bool', 'String', 'dynamic'];
    return !primitiveTypes.includes(typeName);
}
  
/**
 * toJson Metodunu oluşturur
 */

function generateToJsonMethod(fields: FieldInfo[]): string {
    const fieldMappings = fields.map(f => {
        if (f.typeName.startsWith('List')) {
            return `'${f.name}': ${f.name}`;
        } else if (isCustomType(removeQuestionMark(f.typeName))) {
            return `'${f.name}': ${f.name}?.toJson()`;
        } else {
            return `'${f.name}': ${f.name}`;
        }
    }).join(',\n      ');

    return `
    @override
    Map<String, dynamic> toJson() {
        return {
            ${fieldMappings}
        };
    }`;
}
  
/**
 * copyWith Metodunu oluşturur
 */
function generateCopyWithMethod(className: string, fields: FieldInfo[]): string {
    const params = fields
        .map(f => `${removeQuestionMark(f.typeName)}? ${f.name}`)
        .join(',\n        ');

    const assignments = fields
        .map(f => {
            if (f.typeName.includes('List')) {
                return `${f.name}: ${f.name} ?? List.from(this.${f.name}),`;
            } else if (f.typeName.includes('Map')) {
                return `${f.name}: ${f.name} ?? Map.from(this.${f.name}),`;
            } else {
                return `${f.name}: ${f.name} ?? this.${f.name},`;
            }
        })
        .join('\n        ');

    return `
    ${className} copyWith({
        ${params}
    }) {
        return ${className}(
            ${assignments}
        );
    }`;
}
  
  /**
   * Nullable kontrolü yapar
   */
  function isNullable(typeName: string): boolean {
    return typeName.includes('?');
  }
  



/**
 * JSON'dan sınıfları parse eder
 */
function parseJsonToClasses(data: any, className: string): ClassInfo[] {
    const classes: ClassInfo[] = [];
    const thisClass: ClassInfo = { className: toPascalCase(className), fields: [] };
    classes.push(thisClass);

    for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) {
            // Null veya undefined için dinamik nullable tip
            thisClass.fields.push({ name: key, typeName: 'dynamic?' });
        } else if (Array.isArray(value)) {
            // Array durumunu işleme
            if (value.length > 0) {
                if (typeof value[0] === 'object' && value[0] !== null) {
                    // Eğer array'in ilk elemanı bir nesneyse, nested sınıf oluşturulur
                    const nestedClassName = toPascalCase(key);
                    classes.push(...parseJsonToClasses(value[0], nestedClassName));
                    thisClass.fields.push({ name: key, typeName: `List<${nestedClassName}>?` });
                } else {
                    // Primitive tiplerden oluşan array
                    const dartType = inferDartType(value[0]);
                    thisClass.fields.push({ name: key, typeName: `List<${dartType}>` });
                }
            } else {
                // Boş array durumu
                thisClass.fields.push({ name: key, typeName: 'List<dynamic>' });
            }
        } else if (typeof value === 'object') {
            // Eğer değer bir nesneyse, nested sınıf oluşturulur
            const nestedClassName = toPascalCase(key);
            classes.push(...parseJsonToClasses(value, nestedClassName));
            thisClass.fields.push({ name: key, typeName: `${nestedClassName}?` });
        } else {
            // Primitive tipler
            const dartType = inferDartType(value);
            thisClass.fields.push({ name: key, typeName: dartType });
        }
    }

    return classes;
}

/**
 * Dart türlerini tahmin eder
 */
function inferDartType(value: any): string {
    if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'string') return 'String';
        if (value.length > 0 && typeof value[0] === 'number') return 'int';
        if (value.length > 0 && typeof value[0] === 'boolean') return 'bool';
        return 'dynamic';
    }
    if (typeof value === 'string') return 'String';
    if (typeof value === 'number') return value % 1 === 0 ? 'int' : 'double'; // Ondalıklı sayılar için
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'object') return 'Map<String, dynamic>';
    return 'dynamic';
}

/**
 * PascalCase'e dönüştürür
 */
function toPascalCase(str: string): string {
    return str
        .replace(/_/g, ' ') // Alt çizgileri boşluklarla değiştir
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
            index === 0 ? match.toUpperCase() : match.trim().toUpperCase()
        )
        .replace(/\s+/g, ''); // Boşlukları kaldır
}



/**
 * <> karakterlerini kaldırır
 */
function removeBrackets(typeName: string): string {
    return typeName.replace(/[<>?]/g, '');
}
  
/**
 * ? işaretini kaldırır
 */
function removeQuestionMark(typeName: string): string {
    return typeName.replace('?', '');
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

interface FieldInfo {
    name: string;
    typeName: string;
}

interface ClassInfo {
    className: string;
    fields: FieldInfo[];
}

export function deactivate() {}
