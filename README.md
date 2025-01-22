# vexana-model-generator

**vexana-model-generator** is an extension that automatically generates Dart model classes from JSON files for use with the [Vexana](https://pub.dev/packages/vexana) HTTP client library in Flutter or Dart projects.

## Features

- **One-Click Generation**  
  Quickly generate Dart model classes by selecting a JSON file via the Command Palette.

- **Automatic Field Detection**  
  Infers Dart types (`int`, `String`, `bool`, `List<T>`, `Map<String, dynamic>`, etc.) from the JSON values.

- **Vexana Integration**  
  Produces classes extending `INetworkModel` for seamless usage with Vexana in your Dart/Flutter projects.

> *Tip:* Include screenshots or gifs here to illustrate usage. For example:  


## Usage

1. Open the **Command Palette** (Cmd+Shift+P on macOS, Ctrl+Shift+P on Windows/Linux).
2. Run **“Generate Model”** (look for the `vexana-model-generator.generateModel` command).
3. Select a JSON file from your workspace.
4. Input the desired Dart model class name.
5. The generated `.dart` file will open in the editor, including `fromJson` / `toJson` methods integrated with `INetworkModel`.

## Requirements

- A Flutter or Dart project that uses [Vexana](https://pub.dev/packages/vexana) is recommended for best results (though the extension will still generate valid Dart classes without it).

## Extension Settings

Currently, there are no special VS Code settings exposed by this extension.  
The main command is:

- `vexana-model-generator.generateModel`  
  Prompts for a JSON file and model name, then creates a `.dart` file.

## Known Issues

- No known major issues at this time.  
- If you encounter bugs or have suggestions, please open an issue on the extension’s repository.

## Release Notes

### 1.0.0

- Initial release of **vexana-model-generator**.
- Generates Dart model classes from a JSON file for Vexana usage.

### Future Plans

- Provide more customizable generation options.
- Improve handling of nested objects and arrays.

---

## Following Extension Guidelines

Make sure to read through the official [VS Code Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines) and best practices.

## Working with Markdown

You can author and preview this README directly in Visual Studio Code:

- **Split the editor:** Press <kbd>Cmd+\</kbd> on macOS or <kbd>Ctrl+\</kbd> on Windows and Linux.
- **Toggle preview:** Press <kbd>Shift+Cmd+V</kbd> on macOS or <kbd>Shift+Ctrl+V</kbd> on Windows and Linux.
- **Use IntelliSense:** Press <kbd>Ctrl+Space</kbd> on Windows, Linux, or macOS to see a list of Markdown snippets.

**Enjoy using vexana-model-generator!**