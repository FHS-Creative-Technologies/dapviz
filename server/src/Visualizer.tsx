import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  Node,
  NodeProps,
  ReactFlow,
} from "@xyflow/react";
import { HeapVariable, StackFrame, ThreadInfo, Variable } from "./DapvizProvider";

import "@xyflow/react/dist/style.css";
import { useTheme } from "./ThemeProvider";
import { PropsWithChildren } from "react";

type StackFrameNode = Node<StackFrame, "stackFrame">;
type HeapVariableNode = Node<HeapVariable, "heapVariable">;

const BaseNode = ({ children }: PropsWithChildren) => (
  <div className="bg-white text-black dark:bg-neutral-800 dark:text-white p-3 drop-shadow-md dark:drop-shadow-none rounded-lg flex flex-col">
    {children}
  </div>
);

const BaseNodeHeader = ({ children }: PropsWithChildren) => (
  <h2 className="font-medium italic">{children}</h2>
);

export const StackFrameNodeComponent = (props: NodeProps<StackFrameNode>) => {
  return (
    <BaseNode>
      <BaseNodeHeader>{props.data.function}</BaseNodeHeader>
      <ul>
        {props.data.scopes.flatMap((scope) =>
          scope.variables
            .filter((variable) => variable.parent == null)
            .map((variable) => (
              <li className="text-sm" key={variable.name}>
                {variable.name}
                <span className="text-xs opacity-20">
                  {" "}
                  {isHeapVariable(variable) ? variable.address : variable.value}
                </span>
              </li>
            )),
        )}
      </ul>
    </BaseNode>
  );
};

export const HeapVariableNodeCompenent = (props: NodeProps<HeapVariableNode>) => {
  return (
    <BaseNode>
      <BaseNodeHeader>{props.data.type}</BaseNodeHeader>
      <ul>
        {props.data.fields?.map((variable) => (
          <li className="text-sm" key={variable.name}>
            {variable.name}
            <span className="text-xs opacity-20">
              {" "}
              {isHeapVariable(variable) ? variable.address : variable.value}
            </span>
          </li>
        ))}
      </ul>
    </BaseNode>
  );
};

const nodeTypes = {
  stackFrame: StackFrameNodeComponent,
  heapVariable: HeapVariableNodeCompenent,
};

const isStackVariable = (variable: Variable) => variable.reference == 0 && variable.parent != null;
const isHeapVariable = (variable: Variable) => !isStackVariable(variable);

let id = 0;

const Visualizer = ({
  thread,
  heapVariables,
}: {
  thread: ThreadInfo;
  heapVariables: [HeapVariable];
}) => {
  const [theme, toggleTheme] = useTheme();

  const nodes: Node[] = thread.stack_frames.map((stackFrame, i) => ({
    id: String(++id),
    position: { x: 0, y: 200 * i },
    type: "stackFrame",
    data: stackFrame,
  }));

  const heapNodes: Node[] = heapVariables.map((variable, j) => ({
    id: String(++id),
    position: { x: 250, y: 100 * j },
    type: "heapVariable",
    data: variable,
  }));

  nodes.push(...heapNodes);

  return (
    <>
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={nodes}
        nodeTypes={nodeTypes}
        colorMode={theme}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls>
          <ControlButton onClick={toggleTheme}>T</ControlButton>
        </Controls>
      </ReactFlow>
      <details className="font-mono px-4 max-h-screen bg-black/80 absolute top-0 left-0 text-white overflow-y-auto">
        <summary>Debug</summary>
        <h1>Thread</h1>
        <pre>{JSON.stringify(thread, null, 2)}</pre>

        <h1 className="mt-8">Heap</h1>
        <pre>{JSON.stringify(heapVariables, null, 2)}</pre>
      </details>
    </>
  );
};

export default Visualizer;
