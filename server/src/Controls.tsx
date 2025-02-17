import { DapvizRequest, useDapviz } from "./DapvizProvider";

const Controls = ({ currentThread, setCurrentThread }: { currentThread: number, setCurrentThread: React.Dispatch<React.SetStateAction<number>> }) => {
  const [programState, send] = useDapviz();

  const request = (request: DapvizRequest) => () => send(request, programState.threads[currentThread].id);

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
          programState.threads.map((thread, i) => (
            <option key={i} value={i}>{thread.name}</option>
          ))
        }
      </select>
    </div>
  );
};

export default Controls;
