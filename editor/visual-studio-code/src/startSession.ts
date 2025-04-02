import { existsSync } from 'fs';
import * as vscode from 'vscode';
import { getExecutablePath, getOs } from './shared';
import WebSocket from 'ws';
import { promisify } from 'util';

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

    // vscode.Range is zero-based, lsp is one-based
    line = line - 1;

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

    // TODO: ensure this is installed
    const debuggerPath = "/usr/local/netcoredbg";

    try {
        const terminal = vscode.window.createTerminal({
            name: "dapviz",
        });

        terminal.sendText(`${dapvizPath} -p ${PORT} --debug-adapter netcoredbg "${debuggerPath}" "${executablePath}"`);
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
    
    const api = `ws://localhost:${PORT}/api/events`;

    await promisify(setTimeout)(1000);

    const ws = new WebSocket(api);

    let clearPreviousHighlight: (() => void) | null = null;

    ws.on("error", (e) => {
        vscode.window.showErrorMessage("Could not connect to dapviz:", JSON.stringify(e));
    });

    ws.on("message", async (data) => {
        const json = JSON.parse(data.toString());
        const currentStackFrame = json.threads[0].stack_frames[0];

        clearPreviousHighlight?.();
        clearPreviousHighlight = await highlightLine(currentStackFrame.file, currentStackFrame.line);
    });
};
