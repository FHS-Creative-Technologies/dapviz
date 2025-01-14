import { useState } from "react";
import { DapvizRequest, useDapviz } from "./DapvizProvider";

const Controls = () => {
  const [programState, send] = useDapviz();
  const [currentThread, setCurrentThread] = useState<number>(programState.threads[0].id);

  const request = (request: DapvizRequest) => () => send(request, currentThread);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      padding: 8,
      gap: 4,
      pointerEvents: "none",
      zIndex: 2147483647,
    }}>
      <button onClick={request(DapvizRequest.Step)} style={{ pointerEvents: "all" }}>Step</button>
      <button onClick={request(DapvizRequest.StepIn)} style={{ pointerEvents: "all" }}>Step In</button>
      <button onClick={request(DapvizRequest.StepOut)} style={{ pointerEvents: "all" }}>Step Out</button>
      <select defaultValue={currentThread} onChange={(e) => setCurrentThread(+e.target.value)} style={{ pointerEvents: "all" }}>
        {
          programState.threads.map((thread) => (
            <option key={thread.id} value={thread.id}>{thread.name}</option>
          ))
        }
      </select>
    </div>
  );
};

export default Controls;
