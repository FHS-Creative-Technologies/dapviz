import * as vscode from 'vscode';
import { ensureDapvizInstall, getSupportedDebugAdapters } from '../shared';
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
    const targetFile = vscode.Uri.file(filePath);

    // Find an existing editor for this file instead of opening a new one
    let editor = vscode.window.visibleTextEditors.find(
        e => e.document.uri.fsPath === targetFile.fsPath
    );

    if (!editor) {
        const document = await vscode.workspace.openTextDocument(targetFile);
        editor = await vscode.window.showTextDocument(document, vscode.ViewColumn.Active);
    }

    if (!editor) {
        vscode.window.showErrorMessage(`Could not open file: ${filePath}`);
        return () => { };
    }

    // vscode.Range is zero-based, lsp is one-based
    line = line - 1;
    const range = new vscode.Range(line, 0, line, editor.document.lineAt(line).text.length);

    const applyDecoration = () => {
        const currentEditor = vscode.window.visibleTextEditors.find(
            e => e.document.uri.fsPath === targetFile.fsPath
        );
        if (currentEditor) {
            currentEditor.setDecorations(highlightDecoration, [range]);
        }
    };

    applyDecoration();
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

    // Reapply decoration whenever the active editor changes (e.g. switching tabs)
    const listener = vscode.window.onDidChangeVisibleTextEditors(() => applyDecoration());

    return () => {
        listener.dispose();
        const currentEditor = vscode.window.visibleTextEditors.find(
            e => e.document.uri.fsPath === targetFile.fsPath
        );
        if (currentEditor) {
            currentEditor.setDecorations(highlightDecoration, []);
        }
    };
};

export default async (context: vscode.ExtensionContext) => {
    if (getExtensionState().state === ExtensionState.Running) {
        vscode.window.showErrorMessage("Can't start new session, already running");
        return;
    }

    const dapvizPath = await ensureDapvizInstall(context);

    const uri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: "Debug executable",
    });

    const executablePath = uri?.[0].fsPath;

    if (!executablePath) {
        return;
    }

    const debugAdapter = await vscode.window.showQuickPick(await getSupportedDebugAdapters(dapvizPath), {
        placeHolder: "Select the debug adapter use"
    });

    if (!executablePath) {
        return;
    }

    let terminal: vscode.Terminal | null;

    try {
        terminal = vscode.window.createTerminal({
            name: "dapviz",
        });

        terminal.sendText(`RUST_LOG="debug" LOG_OUTPUT="stderr" ${dapvizPath} launch -p ${PORT} --debug-adapter ${debugAdapter} --debugger-path /usr/local/netcoredbg "${executablePath}"`);
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
        vscode.window.showErrorMessage("dapviz error:", JSON.stringify(e));
    });

    ws.on("message", async (data) => {
        const json = JSON.parse(data.toString());

        const stackFrames = json.threads[0].stack_frames;

        if (!stackFrames) {
            return;
        }

        const currentStackFrame = stackFrames[stackFrames.length - 1];

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
