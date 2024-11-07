export interface Variable {
  name: string;
  value: string;
  type: string;
  variablesReference: number;
  memoryReference?: string;
}

export interface HeapObject {
  variable: Variable;
  children: Record<string, HeapObject>;
}

export interface VisualizationState {
  stack: Variable[],
  heap: Record<string, HeapObject>,
}

// dap ts types: https://www.npmjs.com/package/@vscode/debugprotocol
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: cast with valibot or just do known dap types
type HandlerFunction = (state: VisualizationState, data: any) => VisualizationState;

const stateTransformers: Record<string, HandlerFunction> = {
  "variables_response": handleVariablesResponse,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: cast with valibot or just do known dap types
export const applyUpdate = (state: VisualizationState, data: any) => {
  const requestType = `${data.command}_${data.response}`;
  const transformer = stateTransformers[requestType];
  return transformer?.(state, data);
};

function handleVariablesResponse(state: VisualizationState, data: { body: { variables: Variable[] } }) {
  const variables = data.body.variables;
  for (const variable of variables) {
    if (variable.name.startsWith("args")) continue; // TODO: args is also a valid variable name?

    if (isStackVariable(variable)) {
      state.stack.push(variable);
    } else if (isHeapVariable(variable)) {
      const heapObj: HeapObject = {
        variable,
        children: {}, // TODO: handle children
      }

      const key = variable.memoryReference || variable.name;
      state.heap[key] = heapObj;
    } else {
      console.error("Unknown variable type", variable);
    }
  }

  return state;
}

export const isStackVariable = (variable: Variable) => {
  return variable.type === "int" || variable.type === "float"
    || variable.type === "char" || variable.type === "double"
    || variable.type === "bool";
}

export const isHeapVariable = (variable: Variable) => {
  return (variable.memoryReference !== undefined &&
    variable.memoryReference !== "0x0000000000000000") ||
    variable.variablesReference > 0;

}

