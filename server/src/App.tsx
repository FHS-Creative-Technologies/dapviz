import { Canvas } from "@react-three/fiber";
import DapvizProvider from "./DapvizProvider";
import Visualizer from "./Visualizer";
import Controls from "./Controls";

const NoConnectionError = () => (
  <h1 style={{ margin: "auto", textAlign: "center" }}>No Connection</h1>
);

const App = () => {
  return (
    <DapvizProvider
      noConnection={<NoConnectionError />}
    >
      <Canvas frameloop="demand" orthographic camera={{ position: [0, 0, 50], zoom: 0.1, up: [0, 0, 1], far: 10000 }}
        style={{ height: "100%" }}>
        <Visualizer />
      </Canvas>
      <Controls />
    </DapvizProvider>
  );
}

export default App;

