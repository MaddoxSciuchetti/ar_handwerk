"use client";

import { TaskWidget } from "@/components/task-widget";
import type { Task, TaskPioneerDebug } from "@/lib/tasks";

type TasksViewProps = {
  tasks: Task[];
  allClear?: boolean;
  googleConnected?: boolean;
  onTaskUpdate?: (task: Task) => void;
};

function AllClearCelebration() {
  return (
    <div className="all-clear-card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl"
        aria-hidden
      >
        ✓
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold tracking-tight text-zinc-900">
          You&apos;re all clear
        </p>
        <p className="max-w-xs text-[13px] leading-relaxed text-zinc-500">
          No tasks for you to do — enjoy the calm. We analyzed your video and
          didn&apos;t find any work items that need action.
        </p>
      </div>
      <p className="text-[12px] font-medium text-emerald-600">Nothing on your plate today</p>
    </div>
  );
}

export function TasksView({ tasks, allClear, googleConnected, onTaskUpdate }: TasksViewProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const showCelebration = allClear && tasks.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <h1 className="page-title">{today}</h1>

      {googleConnected ? (
        <p className="page-desc">
          Review recommended actions for each task — accept or reject email, calendar, and price
          lookups.
        </p>
      ) : (
        <p className="page-desc">
          Review recommended actions for each task. Connect Google in Settings to send emails and
          create calendar events.
        </p>
      )}

      {showCelebration ? (
        <AllClearCelebration />
      ) : tasks.length === 0 ? (
        <div className="widget-card flex flex-col items-center justify-center gap-1 py-6 text-center">
          <p className="text-[12px] font-medium text-zinc-700">No tasks yet</p>
          <p className="max-w-xs body-sm text-zinc-400">
            Upload a video to extract tasks from the day&apos;s work.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="grid gap-2 lg:grid-cols-2 lg:items-start xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]"
            >
              <TaskWidget
                task={task}
                googleConnected={googleConnected}
                onTaskUpdate={onTaskUpdate}
              />
              {task.pioneerDebug ? (
                <PioneerDebugPanel debug={task.pioneerDebug} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PioneerDebugPanel({ debug }: { debug: TaskPioneerDebug }) {
  const payload =
    debug.extractionSource === "service_task"
      ? {
          extraction_source: debug.extractionSource,
          service_task: debug.serviceTask,
          entities: debug.entities,
        }
      : {
          extraction_source: debug.extractionSource,
          entity_match: debug.entityMatch,
          entities: debug.entities,
        };

  return (
    <details className="widget-card group min-w-0">
      <summary className="cursor-pointer list-none text-[11px] font-medium text-zinc-600 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span>Pioneer extraction (debug)</span>
          <span className="text-[10px] font-normal text-zinc-400 group-open:hidden">Show JSON</span>
          <span className="hidden text-[10px] font-normal text-zinc-400 group-open:inline">Hide JSON</span>
        </span>
      </summary>
      <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-emerald-300">
        {JSON.stringify(payload, null, 2)}
      </pre>
      <details className="mt-2">
        <summary className="cursor-pointer text-[10px] font-medium text-zinc-400">
          Full Pioneer response
        </summary>
        <pre className="mt-1.5 max-h-60 overflow-auto rounded-md bg-zinc-950 p-2.5 text-[10px] leading-relaxed text-zinc-300">
          {JSON.stringify(debug.pioneerResponse, null, 2)}
        </pre>
      </details>
    </details>
  );
}
