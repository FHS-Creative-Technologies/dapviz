import * as vscode from 'vscode';

import startSession from './startSession';
import downloadBinaries from './downloadBinaries';

const commands = {
   "dapviz.startSession": startSession,
   "dapviz.downloadBinaries": downloadBinaries,
} satisfies Record<string, (context: vscode.ExtensionContext) => unknown>;

export function activate(context: vscode.ExtensionContext) {
	const disposables = Object.entries(commands)
		.map(([identifier, handler]) => vscode.commands.registerCommand(identifier, () => handler(context)));

	context.subscriptions.push(...disposables);
}

export function deactivate() {}
