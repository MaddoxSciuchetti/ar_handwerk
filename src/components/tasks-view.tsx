"use client";

import { useEffect, useState } from "react";
import { TaskPill, TaskWidget } from "@/components/task-widget";
import type { Task } from "@/lib/tasks";

type TasksViewProps = {
  tasks: Task[];
  allClear?: boolean;
  googleConnected?: boolean;
  onTaskUpdate?: (task: Task) => void;
};

export function TasksView({ tasks, allClear, googleConnected, onTaskUpdate }: TasksViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (tasks.length === 0) {
      setSelectedTaskId(null);
      return;
    }

    if (!selectedTaskId || !tasks.some((task) => task.id === selectedTaskId)) {
      const firstActive =
        tasks.find(
          (task) => (task.proposedActions?.length ?? 0) > (task.actionFlowStep ?? 0),
        ) ?? tasks[0];
      setSelectedTaskId(firstActive.id);
    }
  }, [selectedTaskId, tasks]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  return (
    <div className="flex min-h-full flex-col gap-3">
      <h1 className="page-title shrink-0">{today}</h1>

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
        <div className="flex flex-1 items-center justify-center py-6">
          <div className="flex w-full max-w-2xl flex-col items-center">
            <div className="relative z-10 -mb-3 flex max-w-full flex-wrap justify-center gap-2 px-2">
              {tasks.map((task, index) => (
                <TaskPill
                  key={task.id}
                  index={index + 1}
                  task={task}
                  selected={task.id === selectedTaskId}
                  onSelect={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>

            {selectedTask ? (
              <TaskWidget
                index={(tasks.findIndex((task) => task.id === selectedTaskId) ?? 0) + 1}
                task={selectedTask}
                googleConnected={googleConnected}
                keyboardEnabled
                onTaskUpdate={onTaskUpdate}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
