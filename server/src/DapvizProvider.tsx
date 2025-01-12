import { createContext, ReactElement, ReactNode, useContext, useEffect, useState } from "react";

export enum DapvizRequest {
  Step = 1,
}

type VisualizationState = unknown;

type DapvizRequestFunction = (request: DapvizRequest) => void;

const DapvizContext = createContext<[VisualizationState, DapvizRequestFunction] | null>(null);

export const useDapviz = () => {
  const data = useContext(DapvizContext);
  if (!data) {
    throw Error("useDapviz called outside of DapvizProvider");
  }

  return data;
}

const DapvizProvider = ({ children, noConnection }: { children: ReactNode, noConnection: ReactElement }) => {
  const [requestFunction, setRequestFunction] = useState<DapvizRequestFunction | null>(null);
  const [visualizationState, setVisualizationState] = useState<VisualizationState>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/api/events`);

    // NOTE: need to use the react state set function overload to set react state to a function
    // https://stackoverflow.com/a/55621325/7482275
    ws.addEventListener("open", () => setRequestFunction(() => (request: DapvizRequest) => {
      ws.send(Uint8Array.from([request]));
    }));

    ws.addEventListener("message", (e) => {
      let json;
      try {
        json = JSON.parse(e.data);
      } catch (err) {
        console.error("Invalid JSON:", e.data, err);
        return;
      }

      setVisualizationState(json)
    })

    ws.addEventListener("close", () => setRequestFunction(null));

    return () => ws.close();
  }, [])

  return (
    (requestFunction !== null) ? (
      <DapvizContext.Provider value={[visualizationState, requestFunction]}>
        {children}
      </DapvizContext.Provider>
    ) : (
      noConnection
    )
  );
};

export default DapvizProvider;
