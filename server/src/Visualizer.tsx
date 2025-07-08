import { DragControls, Grid, MapControls } from "@react-three/drei";
import { StackFrame, ThreadInfo, Variable } from "./DapvizProvider";
import DebugJsonInfo from "./DebugJsonInfo";
import { Container, DefaultProperties, Root, Text } from "@react-three/uikit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/default/accordion";
import { HeapConnectionContext, HeapConnectionsProvider } from "./HeapConnections";
import * as THREE from "three";
import { useContext, useEffect, useRef } from "react";


const BackgroundGrid = () => {
  const size = 100;
  const thickness = 1.5;
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
      <Grid
        cellColor={"#444"}
        cellThickness={thickness / 1.5}
        sectionColor={"#444"}
        sectionThickness={thickness}
        cellSize={size / 2}
        sectionSize={size}
        fadeDistance={50000}
        fadeStrength={1.0}
        infiniteGrid />
    </mesh>
  );
}

const StackFrameVariable = ({ variable }: { variable: Variable }) => {
  return (
    <Container flexDirection="row" justifyContent="space-between" width="auto">
      <Text fontSize={16} color="white">{variable.name}</Text>
      <Text fontSize={16} color="white">{variable.value}</Text>
    </Container>
  );
}


const PrimitiveVariable = ({ variable }: { variable: Variable }) => {
  return (
    <Container flexDirection="row" justifyContent="space-around" width="auto">
      <Text fontSize={16} color="orange">{variable.type}</Text>
      <Text fontSize={16} color="white">{variable.name}</Text>
      <Text fontSize={16} color="white">{variable.value}</Text>
    </Container>
  );
}

const StackFrameViz = ({ stackFrame }: { stackFrame: StackFrame }) => {

  const allFrameVariables = stackFrame.scopes.flatMap((scope) => scope.variables);
  const rootVariables = allFrameVariables.filter((variable) => variable.parent === null);

  return (
    <Container flexDirection="column-reverse" flexGrow={1}>
      <Accordion width="auto">
        {rootVariables.map((variable) => (
          <StackFrameVariable
            key={variable.name}
            variable={variable}
          />
        ))}
      </Accordion>
    </Container>
  );
}

const Stack = ({ thread }: { thread: ThreadInfo }) => {
  return (
    <Container flexDirection="column" width="auto">
      <Accordion width="auto">
        {thread.stack_frames.map((stackFrame, i) => (
          <AccordionItem key={i} width="auto" value={stackFrame.function}>
            <AccordionTrigger>
              <Text fontSize={24} color="white">
                {stackFrame.function}
              </Text>
            </AccordionTrigger>
            <AccordionContent width="auto">
              <StackFrameViz stackFrame={stackFrame} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Container>
  );
}

const HeapNode = ({ variable, allVariables, initialPosition }: {
  variable: Variable;
  allVariables: Variable[];
  initialPosition: [number, number, number],
}) => {

  const groupRef = useRef<THREE.Group>(null);
  const context = useContext(HeapConnectionContext);

  if (!context) {
    throw new Error("HeapNode must be used within a HeapConnectionsProvider");
  }

  const { registerNode, unregisterNode } = context;

  useEffect(() => {
    if (variable.reference > 0 && groupRef.current) {
      registerNode(variable.reference, groupRef as React.RefObject<THREE.Group>);
    }

    return () => {
      if (variable.reference > 0) {
        unregisterNode(variable.reference);
      }
    };
  }, [variable.reference, registerNode, unregisterNode]);

  const primitiveChildren = allVariables.filter(v => v.parent === variable.reference && v.reference === 0);
  const referenceChildren = allVariables.filter(v => v.parent === variable.reference && v.reference > 0);

  const xOffset = 250;
  const yOffset = 100;

  return (
    <>
      <DragControls>
        <group ref={groupRef} position={initialPosition} >
          <Root justifyContent="flex-start" flexDirection="column" pixelSize={0.5}>
            <DefaultProperties fontWeight="medium" >
              <Container
                flexDirection="column"
                backgroundColor={"#2D2D3A"}
                hover={{ backgroundColor: "#3C3C4A" }}
                padding={15}
                borderRadius={12}
                borderWidth={1}
                borderColor={"#4A4A5A"}
              >

                <Container flexDirection="row" justifyContent="space-evenly" alignItems="center" paddingBottom={10}>
                  <Text fontSize={22} color="white" fontWeight="bold" paddingRight={24}>
                    {variable.name}
                  </Text>
                  <Text fontSize={16} color="#A0A0B0" fontStyle="italic">
                    {variable.type}
                  </Text>
                </Container>

                <Container height={1} backgroundColor="#4A4A5A" marginY={4} />

                <Container flexDirection="column" marginTop={14} gap={8}>
                  {primitiveChildren.map(child => (
                    <PrimitiveVariable key={child.name} variable={child} />
                  ))}
                </Container>

              </Container>
            </DefaultProperties>
          </Root>
        </group>
      </DragControls >

      {referenceChildren.map((child, index) => {

        const childPosition: [number, number, number] = [
          initialPosition[0] + xOffset,
          initialPosition[1] - (index * yOffset),
          initialPosition[2]
        ];

        return (

          <HeapNode
            key={child.name}
            variable={child}
            allVariables={allVariables}
            initialPosition={childPosition}
          />

        );
      })
      }
    </>
  );
}

const Visualizer = ({ thread }: { thread: ThreadInfo }) => {
  const allVariables = thread.stack_frames.flatMap(frame =>
    frame.scopes.flatMap(scope => scope.variables)
  );

  const heapVariables = allVariables.filter((variable) => variable.reference > 0 && variable.parent === null);

  return (
    <>
      <DebugJsonInfo thread={thread} />
      <DragControls>
        <Root sizeX={175} sizeY={500} justifyContent="flex-end" flexDirection="column" pixelSize={0.5}>
          <DefaultProperties fontWeight="medium">
            <Stack thread={thread} />
          </DefaultProperties>
        </Root>
      </DragControls>

      <HeapConnectionsProvider allVariables={allVariables}>
        {heapVariables.map((variable, index) => (
          <HeapNode
            key={variable.name}
            variable={variable}
            allVariables={allVariables}
            initialPosition={[300, index * -200, 0]}
          />
        ))}
      </HeapConnectionsProvider>

      <BackgroundGrid />
      <MapControls maxZoom={2} minZoom={0.10} makeDefault />
    </>
  );
}

export default Visualizer;
