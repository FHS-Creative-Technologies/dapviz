import DapvizProvider, { useDapviz } from "./DapvizProvider";
import Visualizer from "./Visualizer";
import Controls from "./Controls";
import { useState } from "react";
import { ThemeProvider } from "./ThemeProvider";

const NoConnectionError = () => (
  <div className="flex flex-col items-center justify-center h-full w-full">
    <main>
      <h1 className="text-2xl mb-2">No Connection</h1>
      <p>Lost connection to dapviz server.</p>
    </main>
  </div>
);

const DapvizApp = () => {
  const [visualizationState] = useDapviz();
  const [currentThread, setCurrentThread] = useState<number>(0);

  return (
    <>
      <Visualizer
        thread={visualizationState.threads[currentThread]}
        heapVariables={visualizationState.heap_variables}
        currentSourceFile={visualizationState.current_source_file}
      />
      <Controls currentThread={currentThread} setCurrentThread={setCurrentThread} />
    </>
  );
};

const App = () => (
  <ThemeProvider>
    <DapvizProvider noConnection={<NoConnectionError />}>
      <DapvizApp />
    </DapvizProvider>
  </ThemeProvider>
);

export default App;
