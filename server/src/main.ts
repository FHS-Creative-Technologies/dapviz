const ws = new WebSocket(`ws://${location.host}/api/events`);

interface Variable {
  name: string;
  value: string;
  type: string;
  variablesReference: number; // do we need this?
  memoryReference?: string; // do we need this?
}

// TODO: handle heap data somehow
const variablesData = {
  stack: [] as Variable[],
  // heap: new Map<string, Variable>()
}

function storeVariables(variables: Variable[]) {
  variables.forEach(variable => {
    if (isStackVariable(variable)) {
      variablesData.stack.push(variable);
    } else {
      // handle heap data
      // variablesData.heap.set(variable.name, variable);
    }
  })
}

// TODO: maybe there is a way to check with memoryRef oder varRef
function isStackVariable(variable: Variable): boolean {
  return variable.type === "int" || variable.type === "float"
    || variable.type === "char" || variable.type === "double";
}

ws.addEventListener("open", (_e) => {
  console.log("connected to ws");
})

ws.addEventListener("message", (e) => {
  try {
    const data = JSON.parse(e.data);

    if (data.type === "response" && data.command === "variables" && data.success) {

      const variables = data.body.variables as Variable[];
      console.log(`received: ${variables}`);

      storeVariables(variables);

      console.log("Stack Variables:", variablesData.stack);
      // console.log("Heap Variables:", Array.from(variablesData.heap.entries()));

    }

  } catch (err) {
    console.error("Invalid JSON:", e.data, err);
  }
});
