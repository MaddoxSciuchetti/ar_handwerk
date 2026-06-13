"use client";

import { TaskWidget } from "@/components/task-widget";
import type { Task } from "@/lib/tasks";

type TasksViewProps = {
  tasks: Task[];
  allClear?: boolean;
  googleConnected?: boolean;
  onTaskUpdate?: (task: Task) => void;
};

export function TasksView({ tasks, allClear, googleConnected, onTaskUpdate }: TasksViewProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const keyboardTaskId = tasks.find(
    (task) => (task.proposedActions?.length ?? 0) > (task.actionFlowStep ?? 0),
  )?.id;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="page-title">{today}</h1>

      {allClear && tasks.length === 0 ? (
        <div className="all-clear-card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-zinc-900">You&apos;re all clear</p>
          <p className="max-w-xs text-[13px] text-zinc-500">No tasks found in your video.</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="widget-card py-8 text-center">
          <p className="text-[12px] text-zinc-500">Upload a video to extract tasks.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskWidget
                task={task}
                googleConnected={googleConnected}
                keyboardEnabled={task.id === keyboardTaskId}
                onTaskUpdate={onTaskUpdate}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
