"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  MapPin,
  ShoppingCart,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { ActionFlow } from "@/components/action-flow";
import { getTaskDisplayAttributes, type Task } from "@/lib/tasks";

type TaskPillProps = {
  index: number;
  task: Task;
  selected: boolean;
  onSelect: () => void;
};

export function TaskPill({ index, task, selected, onSelect }: TaskPillProps) {
  const actions = task.proposedActions ?? [];
  const step = task.actionFlowStep ?? 0;
  const complete = actions.length > 0 && step >= actions.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={task.title}
      className={`focus-ring rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
        selected
          ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
          : complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      Task {index}
    </button>
  );
}

type TaskWidgetProps = {
  index: number;
  task: Task;
  googleConnected?: boolean;
  keyboardEnabled?: boolean;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
};

export function TaskWidget({
  index,
  task,
  googleConnected,
  keyboardEnabled,
  onTaskUpdate,
  onTaskDelete,
}: TaskWidgetProps) {
  return (
    <article className="widget-card flex min-h-[36rem] w-full flex-col overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Task {index}
            </p>
            <h2 className="mt-1 text-[15px] font-semibold leading-snug text-zinc-900">{task.title}</h2>
          </div>
          {onTaskDelete ? (
            <button
              type="button"
              onClick={() => onTaskDelete(task.id)}
              title="Delete task"
              aria-label="Delete task"
              className="focus-ring shrink-0 rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={14} strokeWidth={1.75} aria-hidden />
            </button>
          ) : null}
        </div>
        <TaskAttributePills task={task} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-4">
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

function TaskAttributePills({ task }: { task: Task }) {
  const attributes = getTaskAttributes(task);

  if (attributes.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {attributes.map((attribute) => (
        <li key={attribute.key}>
          <span
            title={`${attribute.label}: ${attribute.value}`}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-700"
          >
            <span className={`shrink-0 ${attribute.tone}`}>{attribute.icon}</span>
            <span className="truncate font-medium">{attribute.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

type TaskAttribute = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  tone: string;
};

const ATTRIBUTE_ICON = { size: 12, strokeWidth: 1.75, "aria-hidden": true as const };

const ATTRIBUTE_META: Record<
  string,
  { icon: ReactNode; tone: string }
> = {
  assignee: { icon: <User {...ATTRIBUTE_ICON} />, tone: "text-sky-600" },
  location: { icon: <MapPin {...ATTRIBUTE_ICON} />, tone: "text-rose-600" },
  deadline: { icon: <Calendar {...ATTRIBUTE_ICON} />, tone: "text-amber-600" },
  problem: { icon: <AlertTriangle {...ATTRIBUTE_ICON} />, tone: "text-orange-600" },
  itemToBuy: { icon: <ShoppingCart {...ATTRIBUTE_ICON} />, tone: "text-emerald-600" },
  equipment: { icon: <Wrench {...ATTRIBUTE_ICON} />, tone: "text-violet-600" },
};

function getTaskAttributes(task: Task): TaskAttribute[] {
  return getTaskDisplayAttributes(task).flatMap((attribute) => {
    const meta = ATTRIBUTE_META[attribute.key];
    if (!meta) return [];

    return [
      {
        key: attribute.key,
        label: attribute.label,
        value: attribute.value,
        icon: meta.icon,
        tone: meta.tone,
      },
    ];
  });
}
