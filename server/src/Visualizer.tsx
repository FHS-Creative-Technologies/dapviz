import { ThreadInfo } from "./DapvizProvider";

const Visualizer = ({ thread }: { thread: ThreadInfo }) => {
    return (
        <details>
            <summary>Debug</summary>
            <pre>{JSON.stringify(thread, null, 2)}</pre>
        </details>
    );
};

export default Visualizer;
