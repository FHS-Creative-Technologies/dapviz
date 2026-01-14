import { DragControls, Grid, MapControls } from "@react-three/drei";
import { StackFrame, ThreadInfo, Variable } from "./DapvizProvider";
import DebugJsonInfo from "./DebugJsonInfo";
import { Container, DefaultProperties, Root, Text } from "@react-three/uikit";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/default/accordion";
import { useMemo } from "react";
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
        infiniteGrid
      />
    </mesh>
  );
};

const StackFrameVariable = ({ variable }: { variable: Variable }) => {
  const theme = useTheme();
  return (
    <Container flexDirection="row" justifyContent="space-between" width="auto">
      <Text fontSize={16} color={theme.text.primary}>
        {variable.name}
      </Text>
      <Text fontSize={16} color={theme.text.primary}>
        {variable.value}
      </Text>
    </Container>
  );
};

const StackFrameViz = ({ stackFrame }: { stackFrame: StackFrame }) => {
  const rootVariables = useMemo(() => {
    const allFrameVariables = stackFrame.scopes.flatMap((scope) => scope.variables);
    return allFrameVariables.filter((variable) => variable.parent === null);
  }, [stackFrame.scopes]);

  return (
    <Container flexDirection="column-reverse" flexGrow={1}>
      <Accordion width="auto">
        {rootVariables.map((variable) => (
          <StackFrameVariable key={variable.name} variable={variable} />
        ))}
      </Accordion>
    </Container>
  );
};

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
};

const Visualizer = ({ thread }: { thread: ThreadInfo }) => {
  return (
    <>
      <DebugJsonInfo thread={thread} />
      <DragControls>
        <Root
          sizeX={175}
          sizeY={500}
          justifyContent="flex-end"
          flexDirection="column"
          pixelSize={0.5}
        >
          <DefaultProperties fontWeight="medium">
            <Stack thread={thread} />
          </DefaultProperties>
        </Root>
      </DragControls>

      <BackgroundGrid />
      <MapControls maxZoom={2} minZoom={0.1} makeDefault />
    </>
  );
};

export default Visualizer;
