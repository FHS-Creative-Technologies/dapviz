import { Canvas } from "@react-three/fiber";
import DapvizProvider, { useDapviz } from "./DapvizProvider";
import Visualizer from "./Visualizer";
import Controls from "./Controls";
import { useState } from "react";

const NoConnectionError = () => (
  <h1 style={{ margin: "auto", textAlign: "center" }}>No Connection</h1>
);

const DapvizApp = () => {
  const [programState,] = useDapviz();
  const [currentThread, setCurrentThread] = useState<number>(0);

  return (
    <>
      <Canvas frameloop="demand" orthographic camera={{ position: [0, 0, 50], zoom: 0.1, up: [0, 0, 1], far: 10000 }}
        style={{ height: "100%" }}>
        <Visualizer thread={programState.threads[currentThread]} />
      </Canvas>
      <Controls currentThread={currentThread} setCurrentThread={setCurrentThread} />
    </>
  );
}

const App = () => (
  <DapvizProvider
    noConnection={<NoConnectionError />}
  >
    <DapvizApp />
  </DapvizProvider>
);

export default App;

