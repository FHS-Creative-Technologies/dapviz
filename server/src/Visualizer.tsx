import { Html, MapControls } from "@react-three/drei";
import { useDapviz } from "./DapvizProvider";

const Visualizer = () => {
  const [visualization,] = useDapviz();
  return (
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
  );
}

export default Visualizer;
