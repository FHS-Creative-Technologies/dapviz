import * as vscode from 'vscode';
import { ensureDapvizInstall } from '../shared';
import WebSocket from 'ws';
import { promisify } from 'util';
import { ExtensionState, getExtensionState, setExtensionState } from '../extension';

// TODO: make this configurable in extension settings
const PORT = 5173;

const highlightDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(245, 201, 58, 0.4)',
    isWholeLine: true,
});

const highlightLine = async (filePath: string, line: number) => {
    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Active);

    if (!editor) {
        vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
        return () => { };
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
    if (getExtensionState().state === ExtensionState.Running) {
        vscode.window.showErrorMessage("Can't start new session, already running");
        return;
    }

    const dapvizPath = await ensureDapvizInstall(context);
    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;

    // TODO: let user choose
    const executablePath = `${workspacePath}/bin/Debug/net9.0/csharp.dll`;

    // TODO: let user choose
    const debugAdapter = "netcoredbg";

    let terminal: vscode.Terminal | null;

    try {
        terminal = vscode.window.createTerminal({
            name: "dapviz",
        });

        terminal.sendText(`RUST_LOG="debug" LOG_OUTPUT="stderr" ${dapvizPath} launch -p ${PORT} --debug-adapter ${debugAdapter} "${executablePath}"`);
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

        const currentStackFrame = json.threads[0]?.stack_frames[0];

        if (currentStackFrame) {
            clearPreviousHighlight?.();
            clearPreviousHighlight = await highlightLine(currentStackFrame.file, currentStackFrame.line);
            setExtensionState({ state: ExtensionState.Running, terminal, ws, clearHighlight: clearPreviousHighlight });
        }
    });

    ws.on("close", () => {
        vscode.commands.executeCommand('dapviz.endSession');
    });

    setExtensionState({ state: ExtensionState.Running, terminal, ws, clearHighlight: () => { } });
};
