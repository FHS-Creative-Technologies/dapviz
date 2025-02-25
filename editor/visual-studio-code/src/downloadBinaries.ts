import { promisify } from "util";
import * as vscode from "vscode";

export default async () => {
    vscode.window.showInformationMessage("Downloading dapviz")

    await promisify(setTimeout)(1000);

    vscode.window.showInformationMessage("Successfully Downloaded dapviz")
};