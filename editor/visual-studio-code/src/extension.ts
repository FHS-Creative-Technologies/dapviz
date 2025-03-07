import * as vscode from 'vscode';

import startSession from './startSession';
import downloadBinaries from './downloadBinaries';

const commands = {
   "dapviz.startSession": startSession,
   "dapviz.downloadBinaries": downloadBinaries,
} satisfies Record<string, (context: vscode.ExtensionContext, ...args: any) => unknown>;

export function activate(context: vscode.ExtensionContext) {
	const disposables = Object.entries(commands)
		.map(([identifier, handler]) => vscode.commands.registerCommand(identifier, (...args) => (handler as (context: vscode.ExtensionContext, ...args: any) => void)(context, ...args)));

	context.subscriptions.push(...disposables);
}

export function deactivate() {}
