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
      pointerEvents: "none",
      zIndex: 2147483647,
    }}>
      <button onClick={request(DapvizRequest.Step)} style={{ pointerEvents: "all" }}>Step</button>
    </div>
  );
};

export default Controls;
