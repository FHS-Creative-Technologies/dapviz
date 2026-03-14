import { ComponentProps } from "react";
import { DapvizRequest, useDapviz } from "./DapvizProvider";
import clsx from "clsx";

const Button = ({ className, ...props }: ComponentProps<"button">) => (
  <button
    className={clsx(
      className,
      "text-sm cursor-pointer bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 px-3 py-1 font-sans",
    )}
    {...props}
  />
);

const Controls = ({
  currentThread,
  setCurrentThread,
}: {
  currentThread: number;
  setCurrentThread: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const [programState, send] = useDapviz();

  const request = (request: DapvizRequest) => () =>
    send(request, programState.threads[currentThread].id);

  return (
    <div className="flex justify-center absolute top-0 inset-x-0 p-4 gap-8 pointer-events-none">
      <Button className="rounded pointer-events-auto" onClick={() => window.location.reload()}>Stack Gone? :(</Button>
      <div className="flex flex-row gap-px bg-neutral-300 dark:bg-neutral-500 rounded pointer-events-auto shadow">
        <Button className="rounded-l" onClick={request(DapvizRequest.Step)}>Step</Button>
        <Button onClick={request(DapvizRequest.StepIn)}>Step In</Button>
        <Button className="rounded-r" onClick={request(DapvizRequest.StepOut)}>Step Out</Button>
      </div>
      <select
        defaultValue={currentThread}
        onChange={(e) => setCurrentThread(+e.target.value)}
        className="text-sm pointer-events-auto cursor-pointer bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 px-3 py-1 rounded shadow"
      >
        {programState.threads.map((thread, i) => (
          <option key={i} value={i}>
            {thread.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Controls;
