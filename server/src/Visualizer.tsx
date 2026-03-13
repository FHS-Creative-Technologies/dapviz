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
import { ComponentProps, useEffect } from "react";
import clsx from "clsx";

import dagre from "@dagrejs/dagre";

type StackFrameNode = Node<StackFrame, "stackFrame">;
type HeapVariableNode = Node<HeapVariable, "heapVariable">;
type SourceNode = Node<{ source: [string, string, number] }, "source">;
type HeadingNode = Node<{ label: string }, "heading">;

const BaseNode = (props: ComponentProps<"div">) => (
  <div
    {...props}
    className={clsx(
      "bg-white text-black dark:bg-neutral-800 dark:text-white p-3 drop-shadow-md dark:drop-shadow-none rounded-lg flex flex-col",
      props,
    )}
  />
);

const BaseNodeHeader = (props: ComponentProps<"h2">) => (
  <h2 {...props} className={clsx("font-bold italic truncate pb-2", props.className)} />
);

const HeadingNodeComponent = ({ data: { label } }: NodeProps<HeadingNode>) => {
  return (
    <div className="text-black dark:text-white">
      <h1 className="font-bold text-4xl text-center">{label}</h1>
    </div>
  );
};

const VariableListComponent = ({ variables }: { variables: Variable[] }) => {
  return (
    <ul>
      {variables.map((variable) => {
        const lastDelimiter = variable.name.lastIndexOf(".");
        const variableName = variable.name.substring(lastDelimiter + 1);

        return (
          <li
            className="relative text-sm flex gap-2 flex-row justify-between items-center"
            key={variable.name}
          >
            <span className="italic truncate">{variableName}</span>
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
        );
      })}
    </ul>
  );
};

export const StackFrameNodeComponent = (props: NodeProps<StackFrameNode>) => {
  return (
    <BaseNode className="w-80">
      <BaseNodeHeader>{props.data.function}</BaseNodeHeader>
      <VariableListComponent variables={props.data.scopes.flatMap((scope) => scope.variables)} />
    </BaseNode>
  );
};

export const HeapVariableNodeCompenent = (props: NodeProps<HeapVariableNode>) => {
  const lastDelimiter = props.data.type.lastIndexOf(".");
  const typeName = props.data.type.substring(lastDelimiter + 1);

  return (
    <BaseNode className="max-w-80">
      <Handle type="target" position={Position.Left} id="in" />
      <BaseNodeHeader>{typeName}</BaseNodeHeader>
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
            <span className="mr-2 text-neutral-500">{String(i + 1).padStart(maxDigits)}</span>{" "}
            {line}
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
  heading: HeadingNodeComponent,
};

const isStackVariable = (variable: Variable) => variable.reference == 0;
const isHeapVariable = (variable: Variable) => !isStackVariable(variable);

const calculateNodeHeight = (variableCount: number) => {
  return (
    16 + // header
    8 + // margin
    20 * variableCount + // variables
    24
  ); // padding
};

const buildGraph = (thread: ThreadInfo, heapVariables: [HeapVariable]): [Node[], Edge[]] => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  let nextStackFramePosition = 0;

  const stackFrameNodes: Node[] = thread.stack_frames.map((stackFrame) => {
    const stackFrameId = `stackframe-${stackFrame.id}`;
    const allVariables = stackFrame.scopes.flatMap((scope) => scope.variables);

    for (const refVar of allVariables.filter((variable) => variable.reference != 0)) {
      edges.push({
        id: `${stackFrameId}-${refVar.name}-${refVar.reference}`,
        source: stackFrameId,
        sourceHandle: `out-${refVar.name}-${refVar.reference}`,
        target: `ref-${refVar.reference}`,
        targetHandle: "in",
      });
    }

    const width = 280;
    const height = calculateNodeHeight(allVariables.length);

    const yPosition = nextStackFramePosition;
    nextStackFramePosition += height + 32;

    return {
      id: stackFrameId,
      parentId: "stackFrameGroup",
      extent: "parent",
      position: { x: 32, y: yPosition + 32 },
      draggable: false,
      type: "stackFrame",
      data: stackFrame,
      style: { width, height },
    };
  });

  stackFrameNodes.push({
    id: "stackHeader",
    position: { x: 32, y: -48 },
    draggable: false,
    type: "heading",
    data: {
      label: "Stack",
    },
    style: { width: 280 },
  });

  stackFrameNodes.push({
    id: "stackFrameGroup",
    position: { x: 0, y: 0 },
    draggable: false,
    type: "group",
    data: {},
    style: {
      width: 280 + 64,
      backgroundColor: "#99999912",
      height: nextStackFramePosition + 32,
      zIndex: -1,
      borderRadius: "0.5rem",
    },
  });

  stackFrameNodes.reverse();

  const heapNodes: Node[] = heapVariables.map((variable) => {
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
      style: { height: calculateNodeHeight(variable.fields.length) },
    };
  });

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "LR", align: "UL" });

  heapNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 280 + 48, height: node.style?.height });
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
      },
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

    if (import.meta.env.DEV) {
      newNodes.push({
        id: "source",
        type: "source",
        position: { x: -800, y: 0 },
        data: { source: currentSourceFile },
      });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [thread, heapVariables, currentSourceFile, setNodes, setEdges]);

  return (
    <>
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        fitView
        minZoom={0.25}
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

      {import.meta.env.DEV && (
        <>
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
      )}
    </>
  );
};

export default Visualizer;
