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

export interface VariablesState {
  stack: Variable[],
  heap: Record<string, HeapObject>,
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

