import { createContext, ReactElement, ReactNode, useContext, useEffect, useReducer, useState } from "react";
import { applyUpdate, VisualizationState } from "./dap";

const DapvizContext = createContext<VisualizationState | null>(null);

export const useDapviz = () => {
  const data = useContext(DapvizContext);
  if (!data) {
    throw Error("useDapviz called outside of DapvizProvider");
  }

  return data;
}

const DapvizProvider = ({ children, noConnection }: { children: ReactNode, noConnection: ReactElement }) => {
  const [connection, setConnection] = useState<boolean>(false);
  const [visualization, dispatch] = useReducer(applyUpdate, { stack: [], heap: {} });

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/api/events`);

    ws.addEventListener("open", () => setConnection(true));

    ws.addEventListener("message", (e) => {
      let json;
      try {
        json = JSON.parse(e.data);
      } catch (err) {
        console.error("Invalid JSON:", e.data, err);
        return;
      }

      if (!json.success) {
        console.error("Unsuccessful DAP Request", json);
        return;
      }

      dispatch(json)
    })

    ws.addEventListener("close", () => setConnection(false));

    return () => ws.close();
  }, [])

  return (
    connection ? (
      <DapvizContext.Provider value={visualization}>
        {children}
      </DapvizContext.Provider>
    ) : (
      noConnection
    )
  );
};

export default DapvizProvider;
