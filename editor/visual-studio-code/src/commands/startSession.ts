import * as vscode from 'vscode';
import { ensureDapvizInstall, userPickDebugAdapter } from '../shared';
import WebSocket from 'ws';
import { promisify } from 'util';
import { ExtensionState, getExtensionState, setExtensionState } from '../extension';
import pRetry, { AbortError } from 'p-retry';

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

const createWebsocket = (url: string) => new Promise<WebSocket>((res, rej) => {
    const ws = new WebSocket(url);

    const onOpen = () => {
        cleanup();
        res(ws);
    };

    const onError = (err: Error) => {
        cleanup();
        ws.terminate();
        rej(err);
    };

    const cleanup = () => {
        ws.off("open", onOpen);
        ws.off("error", onError);
    };

    ws.once("open", onOpen);
    ws.once("error", onError);
});

export default async (context: vscode.ExtensionContext) => {
    if (getExtensionState().state === ExtensionState.Running) {
        vscode.window.showErrorMessage("Can't start new session, already running");
        return;
    }

    const dapvizPath = await ensureDapvizInstall(context);
    const debugAdapter = await userPickDebugAdapter(dapvizPath);

    if (!debugAdapter) {
        return;
    }

    const uri = await vscode.window.showOpenDialog({
        defaultUri: vscode.Uri.file("./bin/Debug/"),
        canSelectMany: false,
        openLabel: "Debug executable",
    });

    const executablePath = uri?.[0].fsPath;

    if (!executablePath) {
        return;
    }

    let terminal: vscode.Terminal | null;

    try {
        terminal = vscode.window.createTerminal({
            name: "dapviz",
        });

        terminal.sendText(`${dapvizPath} launch -p ${PORT} --debug-adapter ${debugAdapter} "${executablePath}"`);
        terminal.show(true);

    } catch (e) {
        vscode.window.showErrorMessage("Could not start terminal command:", JSON.stringify(e));
        return;
    }

    await promisify(setTimeout)(1000);

    // don't retry establishing websocket connection to dapviz if it isn't running anymore
    const abort = new AbortController();
    vscode.window.onDidEndTerminalShellExecution((e) => {
        console.log("Command finished", e);
        if (e.terminal === terminal && e.exitCode !== 0) {
            abort.abort("dapviz server failed to start");
        }
    });
    vscode.window.onDidCloseTerminal((t) => {
        if (t === terminal) {
            abort.abort("terminal closed");
        }
    });

    const api = `ws://localhost:${PORT}/api/events`;
    const ws = await pRetry(
        () => {
            if (abort.signal.aborted) {
                throw new AbortError(abort.signal.reason);
            }

            return createWebsocket(api);
        },
        {
            retries: 6,
            minTimeout: 500,
            factor: 1.5,
        });

    let clearPreviousHighlight: (() => void) | null = null;

    ws.on("message", async (data) => {
        const json = JSON.parse(data.toString());

        const stackFrames = json.threads[0]?.stack_frames;

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

    ws.on("error", (e) => {
        vscode.window.showErrorMessage("dapviz error:", JSON.stringify(e));
    });

    ws.on("close", () => {
        vscode.commands.executeCommand('dapviz.endSession');
    });

    // signal webserver that we're ready
    ws.send("ready");

    const panel = vscode.window.createWebviewPanel(
        'dapvizWebview',
        'dapviz',
        vscode.ViewColumn.Beside,
        { enableScripts: true }
    );
    panel.webview.html = `<iframe src="http://localhost:${PORT}" style="width:100%;height:100vh;border:none;"/>`;

    setExtensionState({ state: ExtensionState.Running, terminal, ws, clearHighlight: () => { } });
};
