"use client";

import { ActionFlow } from "@/components/action-flow";
import type { Task } from "@/lib/tasks";

type TaskWidgetProps = {
  task: Task;
  googleConnected?: boolean;
  keyboardEnabled?: boolean;
  onTaskUpdate?: (task: Task) => void;
};

export function TaskWidget({
  task,
  googleConnected,
  keyboardEnabled,
  onTaskUpdate,
}: TaskWidgetProps) {
  return (
    <article className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
      <div className="widget-card min-w-0">
        <TaskSummary task={task} />
      </div>
      <div className="widget-card min-w-0 overflow-hidden">
        <ActionFlow
          task={task}
          googleConnected={googleConnected}
          keyboardEnabled={keyboardEnabled}
          onTaskUpdate={onTaskUpdate}
        />
      </div>
    </article>
  );
}

function TaskSummary({ task }: { task: Task }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Extracted task
        </p>
        <h3 className="mt-1 text-[14px] font-semibold leading-snug text-zinc-900">{task.title}</h3>
      </div>

      {task.problem ? (
        <p className="text-[12px] leading-relaxed text-zinc-600">{task.problem}</p>
      ) : null}

      <dl className="grid gap-2 text-[12px]">
        {task.assignee ? <Field label="Assignee" value={task.assignee} /> : null}
        {task.location ? <Field label="Location" value={task.location} /> : null}
        {task.deadline ? <Field label="Deadline" value={task.deadline} /> : null}
        {task.itemToBuy ? <Field label="To buy" value={task.itemToBuy} /> : null}
        {task.material ? <Field label="Material" value={task.material} /> : null}
        {task.equipment ? <Field label="Equipment" value={task.equipment} /> : null}
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
