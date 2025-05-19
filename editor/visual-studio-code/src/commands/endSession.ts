import { ExtensionState, getExtensionState, setExtensionState } from '../extension';

export default async () => {
    const state = getExtensionState();
    if (state.state !== ExtensionState.Running) {
        // no need to do anything
        return;
    }

    state.terminal.dispose();
    state.ws.close();
    state.clearHighlight();

    setExtensionState({ state: ExtensionState.Stopped });
};