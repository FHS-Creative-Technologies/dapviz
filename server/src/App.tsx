import { Html } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import DapvizProvider from "./DapvizProvider";
import Visualizer from "./Visualizer";

const NoConnectionError = () => (
  <mesh>
    <Html><h1 style={{ textAlign: "center" }}>No Connection</h1></Html>
  </mesh>
);

const App = () => {
  return (
    <Canvas frameloop="demand" orthographic camera={{ position: [0, 0, 50], zoom: 0.1, up: [0, 0, 1], far: 10000 }}
      style={{ height: "100vh" }}>
      <DapvizProvider
        noConnection={<NoConnectionError />}
      >
        <Visualizer />
      </DapvizProvider>
    </Canvas>
  );
}

export default App;

