import * as vscode from 'vscode';

import { WebSocket } from 'ws';

import startSession from './commands/startSession';
import downloadDapviz from './commands/downloadDapviz';
import installDebugAdapter from './commands/installDebugAdapter';
import endSession from './commands/endSession';

const commands = {
	"dapviz.startSession": startSession,
	"dapviz.endSession": endSession,
	"dapviz.downloadDapviz": downloadDapviz,
	"dapviz.installDebugAdapter": installDebugAdapter,
} satisfies Record<string, (context: vscode.ExtensionContext, ...args: any) => unknown>;

export enum ExtensionState {
	Stopped = "stopped",
	Running = "running",
}

type State =
	| { state: ExtensionState.Stopped }
	| { state: ExtensionState.Running, terminal: vscode.Terminal, ws: WebSocket, clearHighlight: () => void };

let g_state: State = { state: ExtensionState.Stopped };

export const getExtensionState = () => g_state;
export const setExtensionState = (state: State) => {
	vscode.commands.executeCommand('setContext', 'dapviz.state', state.state);
	return g_state = state;
};

export function activate(context: vscode.ExtensionContext) {
	setExtensionState({ state: ExtensionState.Stopped });

	const disposables = Object.entries(commands)
		.map(([identifier, handler]) => vscode.commands.registerCommand(identifier, (...args) => (handler as (context: vscode.ExtensionContext, ...args: any) => void)(context, ...args)));

	context.subscriptions.push(...disposables);
}

export function deactivate() { }
