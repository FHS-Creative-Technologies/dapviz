import * as vscode from "vscode";
import { ensureDapvizInstall, execAsync, getSupportedDebugAdapters } from "../shared";

export default async (context: vscode.ExtensionContext) => {
    const dapvizPath = await ensureDapvizInstall(context);

    const selection = await vscode.window.showQuickPick(await getSupportedDebugAdapters(dapvizPath), {
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