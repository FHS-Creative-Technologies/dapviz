import { Html, MapControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useReducer, useState } from "react";
import { applyUpdate } from "./dap";

const useDapviz = () => {
  const [connection, setConnection] = useState<boolean>(false);
  const [visualization, dispatch] = useReducer(applyUpdate, { stack: [], heap: {} });

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/api/events`);

    ws.addEventListener("open", () => setConnection(true));

    ws.addEventListener("message", (e) => {
      let json;
      try {
        json = JSON.parse(e.data);
      } catch (err) {
        console.error("Invalid JSON:", e.data, err);
        return;
      }

      if (!json.success) {
        console.error("Unsuccessful DAP Request", json);
        return;
      }

      dispatch(json)
    })

    ws.addEventListener("close", () => setConnection(false));

    return () => ws.close();
  }, [])

  return [connection, visualization];
}

const App = () => {
  const [connected, visualization] = useDapviz();

  return (
    <Canvas frameloop="demand" orthographic camera={{ position: [0, 0, 50], zoom: 0.1, up: [0, 0, 1], far: 10000 }}
      style={{ height: "100vh" }}>
      {connected
        ? (
          <>
            <mesh>
              <Html distanceFactor={10}>
                <pre>
                  {JSON.stringify(visualization, null, 2)}
                </pre>
              </Html>
            </mesh>
            <MapControls makeDefault />
          </>
        )
        : (
          <mesh>
            <Html><h1 style={{textAlign: "center"}}>No Connection</h1></Html>
          </mesh>
        )}
    </Canvas>
  );
}

export default App;

