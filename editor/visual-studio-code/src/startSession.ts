import { existsSync } from 'fs';
import { platform } from 'os';
import * as vscode from 'vscode';
import { getExecutablePath, getOs } from './shared';

// TODO: make this configurable in extension settings
const PORT = 5173;

const ensureDapvizInstall = async (context: vscode.ExtensionContext): Promise<string> => {
        const os = getOs();

        const executablePath = getExecutablePath(context, os);

        if (!existsSync(executablePath)) {
            await vscode.commands.executeCommand("dapviz.downloadBinaries");
        } 

        return executablePath;
};

const highlightDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(245, 201, 58, 0.4)',
    isWholeLine: true,
});

const highlightLine = async (filePath: string, line: number) => {
    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Active);

    if (!editor) {
        vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
        return () => {};
    }

    const range = new vscode.Range(line, 0, line, document.lineAt(line).text.length);

    editor.setDecorations(highlightDecoration, [range]);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

    return () => {
        editor.setDecorations(highlightDecoration, []);
    };
};

export default async (context: vscode.ExtensionContext) => {
    const dapvizPath = await ensureDapvizInstall(context);
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    const executablePath = `${workspacePath}/bin/Debug/net9.0/csharp.dll`;

    try {
        const terminal = vscode.window.createTerminal({
            name: "dapviz",
        });

        terminal.sendText(`${dapvizPath} -p ${PORT} --language c-sharp ${executablePath}`);
        terminal.show(true);
    } catch (e) {
        vscode.window.showErrorMessage("Could not start terminal command:", JSON.stringify(e));
        return;
    }

    vscode.commands.executeCommand(
        "simpleBrowser.api.open",
        `http://localhost:${PORT}`,
        {
            viewColumn: vscode.ViewColumn.Beside
        });
    
    let clearPreviousHighlight: (() => void) | null = null;
    const onWebviewMessage = async () => {
        clearPreviousHighlight?.();

        clearPreviousHighlight = await highlightLine("/Users/thekatze/Development/dapviz/playground/csharp/Program.cs", 11);
    };

    onWebviewMessage();
};
