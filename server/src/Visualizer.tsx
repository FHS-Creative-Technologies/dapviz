import { DragControls, Grid, MapControls } from "@react-three/drei";
import { StackFrame, ThreadInfo, Variable } from "./DapvizProvider";
import DebugJsonInfo from "./DebugJsonInfo";
import { Container, DefaultProperties, Root, Text } from "@react-three/uikit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/default/accordion";
import { HeapConnectionsProvider, useHeapConnections } from "./HeapConnectionsProvider";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "./ThemeProvider";

const BackgroundGrid = () => {
  const theme = useTheme();
  const size = 100;
  const thickness = 1.5;
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
      <Grid
        cellColor={theme.grid.cell}
        cellThickness={thickness / 1.5}
        sectionColor={theme.grid.section}
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
  const theme = useTheme();
  return (
    <Container flexDirection="row" justifyContent="space-between" width="auto">
      <Text fontSize={16} color={theme.text.primary}>{variable.name}</Text>
      <Text fontSize={16} color={theme.text.primary}>{variable.value}</Text>
    </Container>
  );
}

const PrimitiveVariable = ({ variable }: { variable: Variable }) => {
  const theme = useTheme();
  return (
    <Container flexDirection="row" justifyContent="space-around" width="auto" renderOrder={1}>
      <Text fontSize={16} color={theme.text.type}>{variable.type}</Text>
      <Text fontSize={16} color={theme.text.primary}>{variable.name}</Text>
      <Text fontSize={16} color={theme.text.primary}>{variable.value}</Text>
    </Container>
  );
}

const StackFrameViz = ({ stackFrame }: { stackFrame: StackFrame }) => {
  const rootVariables = useMemo(() => {
    const allFrameVariables = stackFrame.scopes.flatMap((scope) => scope.variables);
    return allFrameVariables.filter((variable) => variable.parent === null);
  }, [stackFrame.scopes]);

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
  const theme = useTheme();
  return (
    <Container flexDirection="column" width="auto">
      <Accordion width="auto">
        {thread.stack_frames.map((stackFrame, i) => (
          <AccordionItem key={i} width="auto" value={stackFrame.function}>
            <AccordionTrigger>
              <Text fontSize={24} color={theme.text.primary}>
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
  const theme = useTheme();
  const groupRef = useRef<THREE.Group>(null);
  const heapConnections = useHeapConnections();

  const { registerNode, unregisterNode } = heapConnections;

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

  const { primitiveChildren, referenceChildren } = useMemo(() => {
    const pChildren: Variable[] = [];
    const rChildren: Variable[] = [];
    for (const v of allVariables) {
      if (v.parent === variable.reference) {
        if (v.reference === 0) {
          pChildren.push(v);
        } else if (v.reference > 0) {
          rChildren.push(v);
        }
      }
    }
    return { primitiveChildren: pChildren, referenceChildren: rChildren };
  }, [allVariables, variable.reference]);

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
                backgroundColor={theme.node.background}
                hover={{ backgroundColor: theme.node.backgroundHover }}
                padding={15}
                borderRadius={12}
                borderWidth={1}
                borderColor={theme.node.border}
              >

                <Container flexDirection="row" justifyContent="space-evenly" alignItems="center" paddingBottom={10}>
                  <Text fontSize={22} color={theme.text.primary} fontWeight="bold" paddingRight={24} renderOrder={1}>
                    {variable.name}
                  </Text>
                  <Text fontSize={16} color={theme.text.secondary} fontWeight="thin" renderOrder={1}>
                    {variable.type}
                  </Text>
                </Container>

                <Container height={1} backgroundColor={theme.node.divider} marginY={4} />

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
  const allVariables = useMemo(() =>
    thread.stack_frames.flatMap(frame =>
      frame.scopes.flatMap(scope => scope.variables)
    ), [thread.stack_frames]);

  const heapVariables = useMemo(() =>
    allVariables.filter((variable) => variable.reference > 0 && variable.parent === null),
    [allVariables]);

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
