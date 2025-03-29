import { promisify } from "util";
import * as vscode from "vscode";
import { getBinariesFolder, getExecutableName, getExecutablePath, getOs } from "./shared";
import { chmod, mkdir, writeFile } from "fs/promises";
import { existsSync } from "fs";


export default async (context: vscode.ExtensionContext) => {
    const os = getOs();

    const latest = await fetch("https://api.github.com/repos/FHS-Creative-Technologies/dapviz/releases/latest", {
        method: "GET",
        headers: {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    }).then((response) => response.json()) as any;

    // TODO: check if currently downloaded version is latest version, no need to redownload then

    vscode.window.showInformationMessage(`Downloading dapviz ${latest.tag_name}`);

    const binaryName = getExecutableName(os);
    const asset = latest.assets.find((asset: any) => asset.name === binaryName);

    if (!asset) {
        vscode.window.showErrorMessage(`Asset with name not found in release ${latest.tag_name}:`, binaryName);
        throw new Error("Asset not found");
    }

    const binary = await fetch(asset.browser_download_url).then((response) => response.blob());

    const directory = getBinariesFolder(context);
    const filePath = getExecutablePath(context, os);
    
    if (!existsSync(directory)) {
        mkdir(directory, {recursive: true});
    }

    await writeFile(filePath, await binary.bytes());
    await chmod(filePath, 0o755);

    vscode.window.showInformationMessage("Successfully Downloaded dapviz");
};