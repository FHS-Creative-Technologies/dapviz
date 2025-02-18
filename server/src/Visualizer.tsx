import { DragControls, Grid, MapControls } from "@react-three/drei";
import { StackFrame, ThreadInfo, Variable } from "./DapvizProvider";
import DebugJsonInfo from "./DebugJsonInfo";
import { Container, DefaultProperties, Root, Text } from "@react-three/uikit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./components/default/accordion";

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

const VariableViz = ({ variable }: { variable: Variable }) => {
  return (
    <Container flexDirection="row" justifyContent="space-between" width="auto">
      <Text fontSize={16} color="white">{variable.name}</Text>
      <Text fontSize={16} color="white">{variable.value}</Text>
    </Container>
  );
}

const StackFrameViz = ({ stackFrame }: { stackFrame: StackFrame }) => {
  return (
    <Container flexDirection="column-reverse" flexGrow={1}>
      {stackFrame.scopes.flatMap((scope) => scope.variables).filter((variable) => variable.parent == null).map((variable, i) => (
        <VariableViz key={i} variable={variable} />
      ))}
    </Container>
  );
}

const Stack = ({ thread }: { thread: ThreadInfo }) => {
  return (
    <Container flexDirection="column" width="auto">
      <Accordion width="auto">
        {thread.stack_frames.map((stackFrame, i) => (
          <AccordionItem width="auto" value={stackFrame.function}>
            <AccordionContent width="auto">
              <StackFrameViz key={i} stackFrame={stackFrame} />
            </AccordionContent>
            <AccordionTrigger>
              <Text fontSize={24} color="white">
                {stackFrame.function}
              </Text>
            </AccordionTrigger>
          </AccordionItem>
        ))}
      </Accordion>
      <Text fontSize={64} textAlign="center" fontWeight="bold" color="white">Stack</Text>
    </Container>
  );
}

const Visualizer = ({ thread }: { thread: ThreadInfo }) => {
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
      <BackgroundGrid />
      <MapControls maxZoom={2} minZoom={0.10} makeDefault />
    </>
  );
}

export default Visualizer;
