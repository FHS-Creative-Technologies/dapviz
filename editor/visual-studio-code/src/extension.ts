import * as vscode from 'vscode';

import startSession from './commands/startSession';
import downloadBinaries from './commands/downloadBinaries';
import installDebugAdapter from './commands/installDebugAdapter';

const commands = {
	"dapviz.startSession": startSession,
	"dapviz.downloadBinaries": downloadBinaries,
	"dapviz.installDebugAdapter": installDebugAdapter,
} satisfies Record<string, (context: vscode.ExtensionContext, ...args: any) => unknown>;

export function activate(context: vscode.ExtensionContext) {
	const disposables = Object.entries(commands)
		.map(([identifier, handler]) => vscode.commands.registerCommand(identifier, (...args) => (handler as (context: vscode.ExtensionContext, ...args: any) => void)(context, ...args)));

	context.subscriptions.push(...disposables);
}

export function deactivate() { }
