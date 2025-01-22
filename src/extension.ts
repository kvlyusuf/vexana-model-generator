import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('vexana-model-generator.generateModel', async () => {
        const fileUri = await vscode.window.showOpenDialog({
            canSelectMany: false,
            openLabel: 'Select JSON File',
            filters: { 'JSON Files': ['json'] }
        });

        if (fileUri && fileUri[0]) {
            const fileContent = (await vscode.workspace.fs.readFile(fileUri[0])).toString();
            try {
                const modelName = await vscode.window.showInputBox({
                    prompt: 'Enter the model name',
                    placeHolder: 'MyModel'
                });

                if (!modelName) {
                    vscode.window.showErrorMessage('Model name is required.');
                    return;
                }

                const model = generateDartModel(JSON.parse(fileContent), modelName);
                const newFileUri = vscode.Uri.parse('untitled:' + (vscode.workspace.rootPath || '') + `/Generated${modelName}.dart`);
                const document = await vscode.workspace.openTextDocument(newFileUri);
                const edit = new vscode.WorkspaceEdit();
                edit.insert(newFileUri, new vscode.Position(0, 0), model);
                await vscode.workspace.applyEdit(edit);
                vscode.window.showTextDocument(document);
            } catch (error) {
                vscode.window.showErrorMessage('Invalid JSON file. Please provide a valid JSON.');
            }
        }
    });

    context.subscriptions.push(disposable);
}
export function generateDartModel(jsonData: any, modelName: string): string {
	 // Validate JSON input with stricter checks
	 if (typeof jsonData === 'string') {
		try {
		  jsonData = JSON.parse(jsonData);
		} catch (error) {
		  throw new Error('Invalid JSON');
		}
	  }
	
	  if (!jsonData || typeof jsonData !== 'object' || Array.isArray(jsonData)) {
		throw new Error('Invalid JSON');
	  }
	  
	  let fields = '';
  let constructorParams = '';
  let fromJsonBody = '';
  let toJsonBody = '';

  for (const [key, value] of Object.entries(jsonData)) {
    const dartType = inferDartType(value);
    // Fields (no indentation in front)
    fields += `final ${dartType} ${key};\n`;

    // Constructor params (notice the single space before "required")
    constructorParams += ` required this.${key},\n`;

    // fromJsonBody (3 spaces before each line in the argument list)
    fromJsonBody += `   ${key}: json['${key}'],\n`;

    // toJsonBody (3 spaces before each key-value)
    toJsonBody += `   '${key}': ${key},\n`;
  }

  // Trim trailing newlines from each block
  fields = fields.trimEnd();
  constructorParams = constructorParams.trimEnd();
  fromJsonBody = fromJsonBody.trimEnd();
  toJsonBody = toJsonBody.trimEnd();

    // Build the model with exact expected formatting
	return `
	import 'package:vexana/vexana.dart';
	
	class ${modelName} extends INetworkModel<${modelName}> {
	${fields}
	
	${modelName}({
	${constructorParams}
	});
	
	@override
	${modelName} fromJson(Map<String, dynamic> json) {
	 return ${modelName}(
	${fromJsonBody}
	 );
	}
	
	@override
	Map<String, dynamic> toJson() {
	 return {
	${toJsonBody}
	 };
	}
	}
	`.trim();
}

function inferDartType(value: any): string {
    if (typeof value === 'string') return 'String';
    if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
    if (typeof value === 'boolean') return 'bool';
    if (Array.isArray(value)) {
        const itemType = value.length > 0 ? inferDartType(value[0]) : 'dynamic';
        return `List<${itemType}>`;
    }
    if (typeof value === 'object' && value !== null) {
        return 'Map<String, dynamic>';
    }
    return 'dynamic';
}
export function deactivate() {}