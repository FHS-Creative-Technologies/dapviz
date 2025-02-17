import { Html, MapControls } from "@react-three/drei";
import { ThreadInfo } from "./DapvizProvider";

const Visualizer = ({ thread }: { thread: ThreadInfo }) => {
  return (
    <>
      <mesh>
        <Html distanceFactor={10}>
          <pre>
            {JSON.stringify(thread, null, 2)}
          </pre>
        </Html>
      </mesh>
      <MapControls makeDefault />
    </>
  );
}

export default Visualizer;
