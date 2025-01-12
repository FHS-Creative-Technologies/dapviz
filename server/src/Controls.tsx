import { DapvizRequest, useDapviz } from "./DapvizProvider";

const Controls = () => {
  const [, send] = useDapviz();

  const request = (request: DapvizRequest) => () => send(request);

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
    </div>
  );
};

export default Controls;
