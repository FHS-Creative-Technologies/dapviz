import { existsSync } from "fs";
import { platform } from "os";
import path from "path";
import * as vscode from "vscode";

enum Os {
    Linux = "linux",
    MacOS = "macos",
    Windows = "win",
}

/**
 * @throws if platform is unsupported
 * @returns Operating system if platform is supported
 */
export const getOs = () => {
    const os = {
        freebsd: Os.Linux,
        openbsd: Os.Linux,
        netbsd: Os.Linux,
        linux: Os.Linux,
        darwin: Os.MacOS,
        win32: Os.Windows,
        haiku: null,
        sunos: null,
        cygwin: null,
        aix: null,
        android: null,
    }[platform()];

    if (!os) {
        vscode.window.showErrorMessage("Unsupported platform:", platform());
        throw new Error("Unsupported platform");
    }

    return os;
};

export const getBinariesFolder = (context: vscode.ExtensionContext) => {
    return context.asAbsolutePath("bin");
};

export const getExecutableName = (os: Os) => {
    return {
        [Os.Windows]: "x86_64-pc-windows-msvc_dapviz.exe",
        [Os.MacOS]: "aarch64-apple-darwin_dapviz",
        [Os.Linux]: "x86_64-unknown-linux-gnu_dapviz",
    }[os];
};

export const getExecutablePath = (context: vscode.ExtensionContext, os: Os) => {
    return path.join(getBinariesFolder(context), getExecutableName(os));
};

export const ensureDapvizInstall = async (context: vscode.ExtensionContext): Promise<string> => {
    const os = getOs();

    const executablePath = getExecutablePath(context, os);

    if (!existsSync(executablePath)) {
        await vscode.commands.executeCommand("dapviz.downloadBinaries");
    }

    return executablePath;
};
