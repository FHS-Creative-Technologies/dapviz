const ws = new WebSocket(`ws://${location.host}/api/events`);

interface Variable {
  name: string;
  value: string;
  type: string;
  variablesReference: number;
  memoryReference?: string;
}

interface HeapObject {
  variable: Variable;
  children?: Map<string, HeapObject>;
}

const variablesData = {
  stack: [] as Variable[],
  heap: new Map<string, HeapObject>()
}

function storeVariables(variables: Variable[]) {

  variables.forEach(variable => {

    if (variable.name.startsWith("args")) return;


    if (isStackVariable(variable)) {
      variablesData.stack.push(variable);
    } else if (isHeapVariable(variable)) {
      const heapObj: HeapObject = {
        variable,
        children: new Map()
      }

      const key = variable.memoryReference || variable.name;
      variablesData.heap.set(key, heapObj);
    }
  })
}

function isStackVariable(variable: Variable): boolean {
  return variable.type === "int" || variable.type === "float"
    || variable.type === "char" || variable.type === "double"
    || variable.type === "bool";
}

function isHeapVariable(variable: Variable): boolean {
  return (variable.memoryReference !== undefined &&
    variable.memoryReference !== "0x0000000000000000") ||
    variable.variablesReference > 0;

}

ws.addEventListener("open", (_e) => {
  console.log("connected to ws");
})

ws.addEventListener("message", (e) => {
  try {
    const data = JSON.parse(e.data);

    if (data.type === "response" && data.command === "variables" && data.success) {

      const variables = data.body.variables as Variable[];

      variablesData.stack = [];
      variablesData.heap.clear();
      storeVariables(variables);

      console.log("Stack Variables:", variablesData.stack);
      console.log("Heap Objects:", Array.from(variablesData.heap.entries()));

    }

  } catch (err) {
    console.error("Invalid JSON:", e.data, err);
  }
});
