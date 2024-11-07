import { Html, MapControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useReducer } from "react";
import { HeapObject, isHeapVariable, isStackVariable, Variable, VariablesState } from "./dap";

function storeVariables(state: VariablesState, variables: Variable[]) {
  for (const variable of variables) {
    if (variable.name.startsWith("args")) return; // TODO: args is also a valid variable name?

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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: cast with valibot or just do known dap types
const applyUpdate = (state: VariablesState, data: any) => {
  if (data.type === "response" && data.command === "variables" && data.success) {
    const variables = data.body.variables as Variable[];

    state.stack = [];
    state.heap = {};
    storeVariables(state, variables);

    console.log("Stack Variables:", state.stack);
    console.log("Heap Objects:", Array.from(Object.entries(state.heap)));

  }
  return state;
};

function App() {
  const [state, dispatch] = useReducer(applyUpdate, { stack: [], heap: {} });

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/api/events`);
    ws.addEventListener("message", (e) => {
      let json;
      try {
        json = JSON.parse(e.data);
      } catch (err) {
        console.error("Invalid JSON:", e.data, err);
        return;
      }

      dispatch(json)
    })

    return () => ws.close();
  }, [])

  return (
    <Canvas frameloop="demand" orthographic camera={{ position: [0, 0, 50], zoom: 0.1, up: [0, 0, 1], far: 10000 }}
      style={{ height: "100vh" }}>
      <mesh>
        <Html distanceFactor={10}>
          <h1>Hello, World!</h1>

          <pre>
            {JSON.stringify(state, null, 2)}
          </pre>
        </Html>
      </mesh>
      <MapControls makeDefault />
    </Canvas>
  );
}

export default App;

