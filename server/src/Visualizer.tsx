import { DragControls, Grid, Html, MapControls } from "@react-three/drei";
import { ThreadInfo } from "./DapvizProvider";

const BackgroundGrid = () => {
  const size = 100;
  const thickness = 1.5;
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -50]}>
      <Grid
        cellColor={"#444"}
        cellThickness={thickness / 1.5}
        sectionColor={"#444"}
        sectionThickness={thickness}
        cellSize={size / 2}
        sectionSize={size}
        fadeDistance={50000}
        fadeStrength={1.0}
        infiniteGrid />
    </mesh>
  );
}

const DebugJsonInfo = ({ thread }: { thread: ThreadInfo }) => {
  return <DragControls>
    <mesh>
      <mesh position={[30, 5, 0]}>
        <boxGeometry args={[60, 10, 1]} />
      </mesh>
      <Html distanceFactor={1}>
        <details style={{ color: "white", pointerEvents: "all", position: "relative" }}>
          <summary>Debug</summary>
          <pre style={{ position: "absolute" }}>{JSON.stringify(thread, null, 2)}</pre>
        </details>
      </Html>
    </mesh>
  </DragControls>
}

const Visualizer = ({ thread }: { thread: ThreadInfo }) => {
  return (
    <>
      <DebugJsonInfo thread={thread} />
      <BackgroundGrid />
      <MapControls maxZoom={2} minZoom={0.10} makeDefault />
    </>
  );
}

export default Visualizer;
