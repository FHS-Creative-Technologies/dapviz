import { existsSync } from 'fs';
import { platform } from 'os';
import * as vscode from 'vscode';
import { getExecutablePath } from './shared';

// TODO: make this configurable in extension settings
const PORT = 5173;

const ensureDapvizInstall = async (context: vscode.ExtensionContext): Promise<string> => {
        const executablePath = getExecutablePath(context);

        if (!executablePath) {
            vscode.window.showErrorMessage("Unsupported platform:", platform())
            throw "Unsupported platform";
        }

        if (!existsSync(executablePath)) {
            await vscode.commands.executeCommand("dapviz.downloadBinaries");
        } 

        return executablePath;
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
        vscode.window.showErrorMessage("Could not start terminal command:", JSON.stringify(e))
        return;
    }

    vscode.commands.executeCommand(
        "simpleBrowser.api.open",
        `http://localhost:${PORT}`,
        {
            viewColumn: vscode.ViewColumn.Beside
        });
};
