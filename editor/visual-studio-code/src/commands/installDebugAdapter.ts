import * as vscode from "vscode";
import { ensureDapvizInstall, execAsync, getSupportedDebugAdapters, userPickDebugAdapter } from "../shared";

export default async (context: vscode.ExtensionContext) => {
    const dapvizPath = await ensureDapvizInstall(context);
    const selection = await userPickDebugAdapter(dapvizPath);

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