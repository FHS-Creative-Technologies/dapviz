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
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { HeapVariable, StackFrame, ThreadInfo, Variable } from "./DapvizProvider";

import "@xyflow/react/dist/style.css";
import { useTheme } from "./ThemeProvider";
import { PropsWithChildren, useEffect } from "react";
import clsx from "clsx";

import dagre from "@dagrejs/dagre"

type StackFrameNode = Node<StackFrame, "stackFrame">;
type HeapVariableNode = Node<HeapVariable, "heapVariable">;
type SourceNode = Node<{ source: [string, string, number] }, "source">;

const BaseNode = ({ children }: PropsWithChildren) => (
  <div className="bg-white text-black dark:bg-neutral-800 dark:text-white p-3 drop-shadow-md dark:drop-shadow-none rounded-lg flex flex-col">
    {children}
  </div>
);

const BaseNodeHeader = ({ children }: PropsWithChildren) => (
  <h2 className="font-medium italic">{children}</h2>
);

const VariableListComponent = ({ variables }: { variables: Variable[] }) => {
  return (
    <ul className="mt-2">
      {variables.map((variable) => (
        <li
          className="relative text-sm flex flex-row justify-between items-center"
          key={variable.name}
        >
          <span>{variable.name}</span>
          <span className="font-mono">
            {isHeapVariable(variable) ? (
              <span className="font-mono ml-1 text-xs text-neutral-300 dark:text-neutral-600">
                {variable.address}
                <Handle
                  className="absolute right-0 -mr-3"
                  type="source"
                  position={Position.Right}
                  id={`out-${variable.name}-${variable.reference}`}
                />
              </span>
            ) : (
              variable.value
            )}
          </span>
        </li>
      ))}
    </ul>
  );
};

export const StackFrameNodeComponent = (props: NodeProps<StackFrameNode>) => {
  return (
    <BaseNode>
      <BaseNodeHeader>{props.data.function}</BaseNodeHeader>
      <VariableListComponent variables={props.data.scopes.flatMap((scope) => scope.variables)} />
    </BaseNode>
  );
};

export const HeapVariableNodeCompenent = (props: NodeProps<HeapVariableNode>) => {
  return (
    <BaseNode>
      <Handle type="target" position={Position.Left} id="in" />
      <BaseNodeHeader>{props.data.type}</BaseNodeHeader>
      <VariableListComponent variables={props.data.fields} />
    </BaseNode>
  );
};

export const SourceNodeComponent = (props: NodeProps<SourceNode>) => {
  const [fileName, sourceCode, currentLine] = props.data.source;
  const lines = sourceCode.split(/\r?\n/);
  const maxDigits = Math.ceil(Math.log10(lines.length + 1));

  return (
    <BaseNode>
      <BaseNodeHeader>
        {fileName}:{currentLine}
      </BaseNodeHeader>
      <div className="font-mono text-xs mt-4">
        {lines.map((line, i) => (
          <pre key={i} className={clsx(i + 1 == currentLine && "bg-yellow/30")}>
            <span className="mr-2 text-neutral-500">{String(i + 1).padStart(maxDigits)}</span> {line}
          </pre>
        ))}
      </div>
    </BaseNode>
  );
};

const nodeTypes = {
  stackFrame: StackFrameNodeComponent,
  heapVariable: HeapVariableNodeCompenent,
  source: SourceNodeComponent,
};

const isStackVariable = (variable: Variable) => variable.reference == 0;
const isHeapVariable = (variable: Variable) => !isStackVariable(variable);

const buildGraph = (thread: ThreadInfo, heapVariables: [HeapVariable]): [Node[], Edge[]] => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const stackFrameNodes: Node[] = thread.stack_frames.map((stackFrame, i) => {
    const stackFrameId = `stackframe-${stackFrame.id}`;

    for (const refVar of stackFrame.scopes
      .flatMap((scope) => scope.variables)
      .filter((variable) => variable.reference != 0)) {
      edges.push({
        id: `${stackFrameId}-${refVar.name}-${refVar.reference}`,
        source: stackFrameId,
        sourceHandle: `out-${refVar.name}-${refVar.reference}`,
        target: `ref-${refVar.reference}`,
        targetHandle: "in",
      });
    }

    // TODO: calculate size so next can be positioned well
    return {
      id: stackFrameId,
      position: { x: 32, y: 32 + 172 * i },
      draggable: false,
      type: "stackFrame",
      data: stackFrame,
      style: { width: 256 },
    };
  });

  const heapNodes: Node[] = heapVariables.map(variable => {
    const referenceId = `ref-${variable.reference}`;

    for (const refVar of variable.fields.filter((variable) => variable.reference != 0)) {
      edges.push({
        id: `${referenceId}-${refVar.name}-${refVar.reference}`,
        source: referenceId,
        sourceHandle: `out-${refVar.name}-${refVar.reference}`,
        target: `ref-${refVar.reference}`,
        targetHandle: "in",
      });
    }

    return {
      id: referenceId,
      position: { x: 0, y: 0 },
      type: "heapVariable",
      data: variable,
    };
  });

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "LR", align: "UL" });

  heapNodes.forEach((node) => {
    // TODO: calculate size so layouting works well
    dagreGraph.setNode(node.id, { width: 400, height: 300 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedHeapNodes = heapNodes.map((node) => {
    const layoutedNode = dagreGraph.node(node.id);

    return {
      ...node,
      // targetPosition: "left",
      // sourcePosition: "right",
      position: {
        x: 200 + layoutedNode.x,
        y: layoutedNode.y,
      }
    };
  });

  nodes.push(...stackFrameNodes);
  nodes.push(...layoutedHeapNodes);

  return [nodes, edges];
};

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

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  useEffect(() => {
    const [newNodes, newEdges] = buildGraph(thread, heapVariables);

    newNodes.push({
      id: "source",
      type: "source",
      position: { x: -800, y: 0 },
      data: { source: currentSourceFile },
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [thread, heapVariables, currentSourceFile, setNodes, setEdges]);

  return (
    <>
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        colorMode={theme}
        nodesConnectable={false}
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls>
          <ControlButton onClick={toggleTheme}>T</ControlButton>
        </Controls>
      </ReactFlow>

      <details className="text-xs font-mono px-4 max-h-screen bg-black/80 absolute top-0 left-0 text-white overflow-y-auto">
        <summary>Debug</summary>
        <details>
          <summary>Thread</summary>
          <pre>{JSON.stringify(thread, null, 2)}</pre>
        </details>

        <details>
          <summary>Heap</summary>
          <pre>{JSON.stringify(heapVariables, null, 2)}</pre>
        </details>

        <details>
          <summary>Current File</summary>
          <pre>{JSON.stringify(currentSourceFile, null, 2)}</pre>
        </details>

        <details>
          <summary>Nodes</summary>
          <pre>{JSON.stringify(nodes, null, 2)}</pre>
        </details>

        <details>
          <summary>Edges</summary>
          <pre>{JSON.stringify(edges, null, 2)}</pre>
        </details>
      </details>
    </>
  );
};

export default Visualizer;
