import { Grid, Html, MapControls } from "@react-three/drei";
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

const Visualizer = ({ thread }: { thread: ThreadInfo }) => {
  return (
    <>
      <mesh>
        <Html distanceFactor={1}>
          <pre style={{ color: "#FFFFFF" }}>
            {JSON.stringify(thread, null, 2)}
          </pre>
        </Html>
      </mesh>
      <BackgroundGrid />
      <MapControls maxZoom={2} minZoom={0.10} makeDefault />
    </>
  );
}

export default Visualizer;
