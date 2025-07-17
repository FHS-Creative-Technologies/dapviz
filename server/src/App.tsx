import { Canvas } from "@react-three/fiber";
import DapvizProvider, { useDapviz } from "./DapvizProvider";
import Visualizer from "./Visualizer";
import Controls from "./Controls";
import { useState } from "react";
import { gruvboxTheme, ThemeProvider } from "./ThemeProvider";

const NoConnectionError = () => (
  <h1 style={{ margin: "auto", textAlign: "center" }}>No Connection</h1>
);

const DapvizApp = () => {
  const [programState,] = useDapviz();
  const [currentThread, setCurrentThread] = useState<number>(0);

  return (
    <>
      <Canvas frameloop="demand" gl={{ localClippingEnabled: true }} orthographic camera={{ position: [0, 0, 7000], zoom: 1, up: [0, 0, 1], near: 0.1, far: 10000 }}
        style={{ height: "100%" }}>
        <Visualizer thread={programState.threads[currentThread]} />
      </Canvas>
      <Controls currentThread={currentThread} setCurrentThread={setCurrentThread} />
    </>
  );
}

const App = () => (
  <ThemeProvider theme={gruvboxTheme} >
    <DapvizProvider
      noConnection={<NoConnectionError />}
    >
      <DapvizApp />
    </DapvizProvider>
  </ThemeProvider>
);

export default App;

