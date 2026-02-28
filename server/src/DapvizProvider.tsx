/* eslint-disable react-refresh/only-export-components -- if this file gets changed, we don't care about fast refresh */
import { createContext, ReactElement, ReactNode, useContext, useEffect, useState } from "react";

// align these values with `impl TryFrom<Message> for UserRequest` block
export enum DapvizRequest {
  Step = 1,
  StepIn = 2,
  StepOut = 3,
}

export type Variable = {
  parent: number | null;
  reference: number;
  name: string;
  value: string;
  address: string;
  type: string;
};

export type HeapVariable = Omit<Variable, "parent"> & { fields: [Variable] };

export type Scope = {
  variables: [Variable];
};

export type StackFrame = {
  id: number;
  file: string;
  line: number;
  function: string;
  scopes: [Scope];
};

export type ThreadInfo = {
  id: number;
  name: string;
  stack_frames: [StackFrame];
};

export type VisualizationState = {
  threads: [ThreadInfo];
  heap_variables: [HeapVariable];
};

type DapvizRequestFunction = (request: DapvizRequest, threadId: number) => void;

const DapvizContext = createContext<[VisualizationState, DapvizRequestFunction] | null>(null);

export const useDapviz = () => {
  const data = useContext(DapvizContext);
  if (!data) {
    throw Error("useDapviz called outside of DapvizProvider");
  }

  return data;
};

const DapvizProvider = ({
  children,
  noConnection,
}: {
  children: ReactNode;
  noConnection: ReactElement;
}) => {
  const [requestFunction, setRequestFunction] = useState<DapvizRequestFunction | null>(null);
  const [visualizationState, setVisualizationState] = useState<VisualizationState | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/api/events`);

    // NOTE: need to use the react state set function overload to set react state to a function
    // https://stackoverflow.com/a/55621325/7482275
    ws.addEventListener("open", () =>
      setRequestFunction(() => (request: DapvizRequest, threadId: number) => {
        const data = new ArrayBuffer(9);
        const view = new DataView(data);

        view.setBigInt64(0, BigInt(threadId), true);
        view.setInt8(8, request);

        ws.send(data);
      }),
    );

    ws.addEventListener("message", (e) => {
      let json;
      try {
        json = JSON.parse(e.data);
      } catch (err) {
        console.error("Invalid JSON:", e.data, err);
        return;
      }

      if (json?.threads?.length > 0) {
        setVisualizationState(json);
      } else {
        setVisualizationState(null);
      }
    });

    ws.addEventListener("close", () => {
      setRequestFunction(null);
      setVisualizationState(null);
    });

    return () => ws.close();
  }, []);

  return requestFunction !== null && visualizationState !== null ? (
    <DapvizContext.Provider value={[visualizationState, requestFunction]}>
      {children}
    </DapvizContext.Provider>
  ) : (
    noConnection
  );
};

export default DapvizProvider;
