import DapvizProvider, { useDapviz } from "./DapvizProvider";
import Visualizer from "./Visualizer";
import Controls from "./Controls";
import { useState } from "react";
import { ThemeProvider } from "./ThemeProvider";

const NoConnectionError = () => (
    <h1 style={{ margin: "auto", textAlign: "center" }}>No Connection</h1>
);

const DapvizApp = () => {
    const [programState] = useDapviz();
    const [currentThread, setCurrentThread] = useState<number>(0);

    return (
        <>
            <Visualizer thread={programState.threads[currentThread]} />
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
