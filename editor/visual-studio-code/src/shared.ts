import { platform } from "os";
import path from "path";
import * as vscode from "vscode";

enum Os {
    Linux = "linux",
    MacOS = "macos",
    Windows = "win",
}

export const getOs = () => {
    return {
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
};

export const getBinariesFolder = (context: vscode.ExtensionContext) => {
   return context.asAbsolutePath("bin");
}

export const getExecutablePath = (context: vscode.ExtensionContext) => {
    const os = getOs();
    if (!os) return null;

    return path.join(getBinariesFolder(context), os == Os.Windows ? "dapviz.exe" : "dapviz");
}