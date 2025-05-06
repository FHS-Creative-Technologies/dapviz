import * as vscode from "vscode";
import { ensureDapvizInstall } from "../shared";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async (context: vscode.ExtensionContext) => {
    const dapvizPath = await ensureDapvizInstall(context);

    const commandResult = await execAsync(`${dapvizPath} list-debug-adapters`);
    const debugAdapters = commandResult.stdout.split(/\r?\n|\r/).filter(line => line.length > 0);

    const selection = await vscode.window.showQuickPick(debugAdapters, {
        placeHolder: "Select the debug adapter to install"
    });

    if (selection) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Installing ${selection}`,
            cancellable: false,
        }, async () => {
            await execAsync(`${dapvizPath} install ${selection}`);
            vscode.window.showInformationMessage(`Successfully Downloaded ${selection}`);
        });
    }
};