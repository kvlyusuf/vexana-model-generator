import * as vscode from 'vscode';
import { generateDartModel } from '../../dist/extension';
import * as assert from 'assert';

// Bu test dosyası, uzantının temel fonksiyonlarını sınar.
suite('Vexana Model Generator Test Suite', () => {
  // Testlere başlamadan önce uzantıyı aktif hâle getiriyoruz.
  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension('yusufkaval.vexana-model-generator');
    await extension?.activate();
  });

  test('generateDartModel creates correct Dart model', () => {
    const jsonInput = {
        id: 1,
        name: 'John Doe',
        isActive: true,
        tags: ['developer', 'programmer'],
        metadata: { age: 30, city: 'Istanbul' },
    };

    const expectedOutput = `
import 'package:vexana/vexana.dart';

class TestModel extends INetworkModel<TestModel> {
  final int id;
  final String name;
  final bool isActive;
  final List<String> tags;
  final Metadata? metadata; // Eğer Metadata sınıfı doğru ise böyle bırakın.

  TestModel({
    required this.id,
    required this.name,
    required this.isActive,
    required this.tags,
    required this.metadata,
  });

  @override
  TestModel fromJson(Map<String, dynamic> json) {
    return TestModel(
      id: json['id'] as int,
      name: json['name'] as String,
      isActive: json['isActive'] as bool,
      tags: List<String>.from(json['tags'] as List<dynamic>),
      metadata: json['metadata'] != null
          ? Metadata.fromJson(json['metadata'] as Map<String, dynamic>)
          : null, // Eğer Metadata sınıfı varsa.
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'isActive': isActive,
      'tags': tags,
      'metadata': metadata?.toJson(), // Eğer Metadata sınıfı varsa.
    };
  }
}
`.trim();

    const result = generateDartModel(JSON.stringify(jsonInput), 'TestModel', {
        includeCopyWith: false,
        includeEquatableMixin: false,
        includeJsonSerializable: false,
        includeFreezed: false,
    });

    assert.strictEqual(
        normalizeWhitespace(result),
        normalizeWhitespace(expectedOutput),
        `Test failed. Expected:\n${expectedOutput}\nBut got:\n${result}`
    );
});
  test('Extension command is registered', async () => {
    const command = 'vexana-model-generator.generateModel';
    const commandRegistered = await vscode.commands.getCommands(true).then((commands) => {
      return commands.includes(command);
    });
    assert.strictEqual(commandRegistered, true);
  });

  test('Invalid JSON input should throw error', () => {
    const invalidJson = '{ invalid: "json }';
    // Direkt JSON.parse ile SyntaxError bekliyoruz
    assert.throws(() => {
      JSON.parse(invalidJson);
    }, SyntaxError);
  });

  test('Invalid JSON input should throw error in generateDartModel', () => {
    const invalidJson = '{ invalid: json }';
    console.log('Calling generateDartModel with:', invalidJson);

    assert.throws(() => {
      generateDartModel(invalidJson, 'TestModel', {
        includeCopyWith: false,
        includeEquatableMixin: false,
        includeJsonSerializable: false,
        includeFreezed: false
      });
    }, /Invalid JSON/);
  });

  test('generateDartModel includes copyWith method if option enabled', () => {
    const jsonInput = {
      id: 1,
      name: 'John Doe'
    };

    const result = generateDartModel(JSON.stringify(jsonInput), 'TestModel', {
      includeCopyWith: true,
      includeEquatableMixin: false,
      includeJsonSerializable: false,
      includeFreezed: false
    });

    assert.match(result, /TestModel copyWith\(\{/);
  });

  test('generateDartModel includes @JsonSerializable if option enabled', () => {
    const jsonInput = {
      id: 1,
      name: 'John Doe'
    };

    const result = generateDartModel(JSON.stringify(jsonInput), 'TestModel', {
      includeCopyWith: false,
      includeEquatableMixin: false,
      includeJsonSerializable: true,
      includeFreezed: false
    });

    assert.match(result, /@JsonSerializable\(\)/);
  });

  test('generateDartModel includes EquatableMixin if option enabled', () => {
    const jsonInput = {
      id: 1,
      name: 'John Doe'
    };

    const result = generateDartModel(JSON.stringify(jsonInput), 'TestModel', {
      includeCopyWith: false,
      includeEquatableMixin: true,
      includeJsonSerializable: false,
      includeFreezed: false
    });

    assert.match(result, /with EquatableMixin/);
  });

  test('generateDartModel includes @freezed if option enabled', () => {
    const jsonInput = {
      id: 1,
      name: 'John Doe'
    };

    const result = generateDartModel(JSON.stringify(jsonInput), 'TestModel', {
      includeCopyWith: false,
      includeEquatableMixin: false,
      includeJsonSerializable: false,
      includeFreezed: true
    });

    assert.match(result, /@freezed/);
  });
});

/**
 * Boşlukları kaldırarak karşılaştırmak için basit yardımcı fonksiyon
 */
function normalizeWhitespace(str: string): string {
	return str
	  .split('\n')
	  .map(line => line.trim()) // Satır başı ve sonundaki boşlukları kaldır
	  .filter(line => line.length > 0) // Boş satırları çıkar
	  .join('\n'); // Satırları tekrar birleştir
  }

  function removeComments(str: string): string {
	return str.replace(/\/\/.*$/gm, ''); // Tüm `//` ile başlayan yorumları kaldır
  }