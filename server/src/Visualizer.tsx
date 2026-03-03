import {
  Background,
  BackgroundVariant,
  ControlButton,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
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
              <li className="relative text-sm" key={variable.name}>
                {variable.name}
                <span className="text-xs opacity-20">
                  {" "}
                  {isHeapVariable(variable) ? (
                    <>
                      {variable.address}
                      <Handle
                        className="absolute right-0 -mr-3"
                        type="source"
                        position={Position.Right}
                        id={`out-${variable.name}-${variable.reference}`}
                      />
                    </>
                  ) : (
                    variable.value
                  )}
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
      <Handle type="target" position={Position.Left} id="in" />
      <BaseNodeHeader>{props.data.type}</BaseNodeHeader>
      <ul>
        {props.data.fields?.map((variable) => (
          <li className="relative text-sm" key={variable.name}>
            {variable.name}
            <span className="text-xs opacity-20">
              {" "}
              {isHeapVariable(variable) ? (
                <>
                  {variable.address}
                  <Handle
                    className="absolute right-0 -mr-3"
                    type="source"
                    position={Position.Right}
                    id={`out-${variable.name}-${variable.reference}`}
                  />
                </>
              ) : (
                variable.value
              )}
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

const isStackVariable = (variable: Variable) => variable.reference == 0;
const isHeapVariable = (variable: Variable) => !isStackVariable(variable);

const Visualizer = ({
  thread,
  heapVariables,
  currentSourceFile,
}: {
  thread: ThreadInfo;
  heapVariables: [HeapVariable];
  currentSourceFile: [string, string, number];
}) => {
  const [theme, toggleTheme] = useTheme();

  const nodes: Node[] = [
    {
      id: "stackGroup",
      type: "group",
      position: { x: 0, y: 0 },
      style: { width: 256 + 64, height: 600 },
      data: {},
    },
  ];
  const edges: Edge[] = [];

  const stackFrameNodes: Node[] = thread.stack_frames.map((stackFrame, i) => {
    const stackFrameId = `stackframe-${stackFrame.id}`;

    for (const refVar of stackFrame.scopes
      .flatMap((scope) => scope.variables)
      .filter((variable) => variable.reference != 0)) {
      edges.push({
        id: `${stackFrameId}-${refVar.reference}`,
        source: stackFrameId,
        sourceHandle: `out-${refVar.name}-${refVar.reference}`,
        target: `ref-${refVar.reference}`,
        targetHandle: "in",
      });
    }

    return {
      id: stackFrameId,
      parentId: "stackGroup",
      position: { x: 32, y: 32 + 172 * i },
      type: "stackFrame",
      data: stackFrame,
      style: { width: 256 },
    };
  });

  const heapNodes: Node[] = heapVariables.map((variable, j) => {
    const referenceId = `ref-${variable.reference}`;

    for (const refVar of variable.fields.filter((variable) => variable.reference != 0)) {
      edges.push({
        id: `${referenceId}-${refVar.reference}`,
        source: referenceId,
        sourceHandle: `out-${refVar.name}-${refVar.reference}`,
        target: `ref-${refVar.reference}`,
        targetHandle: "in",
      });
    }

    return {
      id: referenceId,
      position: { x: 400, y: 128 * j },
      type: "heapVariable",
      data: variable,
    };
  });

  nodes.push(...stackFrameNodes);
  nodes.push(...heapNodes);

  return (
    <>
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={theme}
        nodesConnectable={false}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls>
          <ControlButton onClick={toggleTheme}>T</ControlButton>
        </Controls>
      </ReactFlow>

      <details className="font-mono px-4 max-h-screen bg-black/80 absolute top-0 left-0 text-white overflow-y-auto">
        <summary>Debug</summary>
        <details>
          <summary>Thread</summary>
          <pre>{JSON.stringify(thread, null, 2)}</pre>
        </details>

        <details>
          <summary>Heap</summary>
          <pre>{JSON.stringify(heapVariables, null, 2)}</pre>
        </details>

        <details open>
          <summary>Current File</summary>
          <pre>{JSON.stringify(currentSourceFile, null, 2)}</pre>
        </details>

        <details open>
          <summary>Nodes</summary>
          <pre>{JSON.stringify(nodes, null, 2)}</pre>
        </details>

        <details open>
          <summary>Edges</summary>
          <pre>{JSON.stringify(edges, null, 2)}</pre>
        </details>
      </details>
    </>
  );
};

export default Visualizer;
