"use client";

import { ActionFlow } from "@/components/action-flow";
import type { Task } from "@/lib/tasks";

type TaskWidgetProps = {
  task: Task;
  googleConnected?: boolean;
  onTaskUpdate?: (task: Task) => void;
};

const STATUS_LABEL: Record<Task["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  done: "Done",
};

const STATUS_DOT: Record<Task["status"], string> = {
  pending: "bg-amber-400",
  in_progress: "bg-zinc-400",
  done: "bg-emerald-500",
};

export function TaskWidget({ task, googleConnected, onTaskUpdate }: TaskWidgetProps) {
  return (
    <article className="widget-card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[12px] font-semibold leading-snug tracking-tight text-zinc-900">
          {task.title}
        </h3>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[task.status]}`} />
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      {task.problem ? (
        <p className="body-sm text-zinc-500">{task.problem}</p>
      ) : null}

      <dl className="grid gap-1.5 body-sm">
        {task.itemToBuy ? <Row label="To buy" value={task.itemToBuy} /> : null}
        {task.assignee ? <Row label="Assignee" value={task.assignee} /> : null}
        {task.location ? <Row label="Location" value={task.location} /> : null}
        {task.deadline ? <Row label="Deadline" value={task.deadline} /> : null}
      </dl>

      <ActionFlow
        task={task}
        googleConnected={googleConnected}
        onTaskUpdate={onTaskUpdate}
      />
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-zinc-100 pt-2 first:border-0 first:pt-0">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="text-right font-medium text-zinc-700">{value}</dd>
    </div>
  );
}
