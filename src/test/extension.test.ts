var assert = require("assert");

import * as vscode from 'vscode';
import { generateDartModel } from '../../dist/extension';



suite('Vexana Model Generator Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suiteSetup(async () => {
		const extension = vscode.extensions.getExtension('yusufkaval.vexana-model-generator');
		await extension?.activate();
	  });

	test('generateDartModel creates correct Dart model', () => {
		const jsonInput = {
            id: 1,
            name: "John Doe",
            isActive: true,
            tags: ["developer", "programmer"],
            metadata: { age: 30, city: "Istanbul" }
        };

	  
		// Dikkat: Aşağıdaki kod bloklarında hiçbir satır başında fazla boşluk yok.
		// Tümü sol kenardan başlıyor, constructor vb. içindeki " required this.id," 
		// satırları testin beklediği şekilde hizalanmış.
		const expectedOutput = `import 'package:vexana/vexana.dart';
class TestModel extends INetworkModel<TestModel> {
final int id;
final String name;
final bool isActive;
final List<String> tags;
final Map<String, dynamic> metadata;

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
id: json['id'],
name: json['name'],
isActive: json['isActive'],
tags: json['tags'],
metadata: json['metadata'],
);
}
  
@override
Map<String, dynamic> toJson() {
return {
'id': id,
'name': name,
'isActive': isActive,
'tags': tags,
'metadata': metadata,
};
}
}`.trim();
		
				const result = generateDartModel(jsonInput, "TestModel");
				assert.strictEqual(
					removeAllWhitespace(result),
					removeAllWhitespace(expectedOutput)
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

		assert.throws(() => {
			JSON.parse(invalidJson); // Doğrudan JSON.parse hatasını doğrulayın
		}, SyntaxError);
	});

	test('Invalid JSON input should throw error in generateDartModel', () => {
  const invalidJson = '{ invalid: json }';
  console.log("Calling generateDartModel with:", invalidJson);
  assert.throws(() => {
    generateDartModel(invalidJson, 'TestModel');
  }, /Invalid JSON/);
});
	

	  function removeAllWhitespace(str: string): string {
		return str.replace(/\s+/g, '');
	  }
	  
});




