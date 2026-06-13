"use client";

import type { ReactNode } from "react";
import {
  Calendar,
  MapPin,
  Package,
  ShoppingCart,
  User,
  Wrench,
} from "lucide-react";
import { ActionFlow } from "@/components/action-flow";
import type { Task } from "@/lib/tasks";

type TaskPillProps = {
  task: Task;
  selected: boolean;
  onSelect: () => void;
};

export function TaskPill({ task, selected, onSelect }: TaskPillProps) {
  const actions = task.proposedActions ?? [];
  const step = task.actionFlowStep ?? 0;
  const complete = actions.length > 0 && step >= actions.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={task.title}
      className={`focus-ring max-w-[11rem] truncate rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
        selected
          ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
          : complete
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      {task.title}
    </button>
  );
}

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
    <article className="widget-card flex min-h-[28rem] w-full flex-col overflow-hidden">
      <div className="flex min-h-12 shrink-0 items-center border-b border-zinc-100 px-5 py-4">
        <TaskAttributePills task={task} />
      </div>

      <div className="flex min-h-96 flex-1 items-center justify-center px-5 py-8">
        <div className="h-full w-full max-w-lg">
          <ActionFlow
            task={task}
            googleConnected={googleConnected}
            keyboardEnabled={keyboardEnabled}
            onTaskUpdate={onTaskUpdate}
          />
        </div>
      </div>
    </article>
  );
}

function TaskAttributePills({ task }: { task: Task }) {
  const attributes = getTaskAttributes(task);

  if (attributes.length === 0) {
    return <div className="min-h-7 w-full" aria-hidden />;
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

function getTaskAttributes(task: Task): TaskAttribute[] {
  const attributes: TaskAttribute[] = [];

  if (task.assignee) {
    attributes.push({
      key: "assignee",
      label: "Assignee",
      value: task.assignee,
      icon: <User {...ATTRIBUTE_ICON} />,
      tone: "text-sky-600",
    });
  }
  if (task.location) {
    attributes.push({
      key: "location",
      label: "Location",
      value: task.location,
      icon: <MapPin {...ATTRIBUTE_ICON} />,
      tone: "text-rose-600",
    });
  }
  if (task.deadline) {
    attributes.push({
      key: "deadline",
      label: "Deadline",
      value: task.deadline,
      icon: <Calendar {...ATTRIBUTE_ICON} />,
      tone: "text-amber-600",
    });
  }
  if (task.itemToBuy) {
    attributes.push({
      key: "itemToBuy",
      label: "To buy",
      value: task.itemToBuy,
      icon: <ShoppingCart {...ATTRIBUTE_ICON} />,
      tone: "text-emerald-600",
    });
  }
  if (task.material) {
    attributes.push({
      key: "material",
      label: "Material",
      value: task.material,
      icon: <Package {...ATTRIBUTE_ICON} />,
      tone: "text-orange-600",
    });
  }
  if (task.equipment) {
    attributes.push({
      key: "equipment",
      label: "Equipment",
      value: task.equipment,
      icon: <Wrench {...ATTRIBUTE_ICON} />,
      tone: "text-violet-600",
    });
  }

  return attributes;
}
