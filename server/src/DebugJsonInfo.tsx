import { DragControls, Html } from "@react-three/drei"
import { ThreadInfo } from "./DapvizProvider"

let DebugJsonInfo: React.FC<{ thread: ThreadInfo }>;

if (import.meta.env.DEV) {
  DebugJsonInfo = ({ thread }: { thread: ThreadInfo }) => {
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
} else {
  DebugJsonInfo = () => (<></>);
}

export default DebugJsonInfo;
