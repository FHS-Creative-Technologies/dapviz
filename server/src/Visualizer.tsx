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

const VariableTree = ({ variable, allVariables }: { variable: Variable; allVariables: Variable[] }) => {
  const children = allVariables.filter(v => v.parent === variable.reference);

  if (variable.reference === 0 || children.length === 0) {
    return (
      <Container flexDirection="row" justifyContent="space-between" width="auto">
        <Text fontSize={16} color="white">{variable.name}</Text>
        <Text fontSize={16} color="white">{variable.value}</Text>
      </Container>
    );
  }

  return (
    <AccordionItem width="auto" value={variable.reference.toString()}>
      <AccordionTrigger>
        <Text fontSize={16} color="white">{variable.name}: {variable.value}</Text>
      </AccordionTrigger>
      <AccordionContent width="auto">
        <Container flexDirection="column" width="auto" paddingLeft={10}>
          {children.map((childVariable) => (
            <VariableTree
              key={childVariable.reference > 0 ? childVariable.reference : childVariable.name}
              variable={childVariable}
              allVariables={allVariables}
            />
          ))}
        </Container>
      </AccordionContent>
    </AccordionItem>
  );
}

const StackFrameViz = ({ stackFrame }: { stackFrame: StackFrame }) => {

  const allFrameVariables = stackFrame.scopes.flatMap((scope) => scope.variables);
  const rootVariables = allFrameVariables.filter((variable) => variable.parent === null);

  return (
    <Container flexDirection="column-reverse" flexGrow={1}>
      <Accordion width="auto">
        {rootVariables.map((variable) => (
          <VariableTree
            key={variable.reference > 0 ? variable.reference : variable.name}
            variable={variable}
            allVariables={allFrameVariables}
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
