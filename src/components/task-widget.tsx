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

const ATTRIBUTE_ICON = { size: 12, strokeWidth: 1.75, "aria-hidden": true as const };

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
    <article className="widget-card flex w-full flex-col overflow-hidden">
      <div className="flex min-h-72 flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <ActionFlow
            task={task}
            googleConnected={googleConnected}
            keyboardEnabled={keyboardEnabled}
            onTaskUpdate={onTaskUpdate}
          />
        </div>
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/60 px-4 py-4">
        <TaskSummary task={task} />
      </div>
    </article>
  );
}

function TaskSummary({ task }: { task: Task }) {
  const attributes = getTaskAttributes(task);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Task details
        </p>
        <h3 className="mt-1 text-[14px] font-semibold leading-snug text-zinc-900">{task.title}</h3>
      </div>

      {attributes.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {attributes.map((attribute) => (
            <li key={attribute.key}>
              <span
                title={`${attribute.label}: ${attribute.value}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200/80 bg-white px-2 py-1 text-[11px] text-zinc-700"
              >
                <span className={`shrink-0 ${attribute.tone}`}>{attribute.icon}</span>
                <span className="truncate font-medium">{attribute.value}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {task.problem ? (
        <p className="text-[12px] leading-relaxed text-zinc-600">{task.problem}</p>
      ) : null}

      <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
        {task.assignee ? (
          <Field label="Assignee" value={task.assignee} icon={<User {...ATTRIBUTE_ICON} />} tone="text-sky-600" />
        ) : null}
        {task.location ? (
          <Field label="Location" value={task.location} icon={<MapPin {...ATTRIBUTE_ICON} />} tone="text-rose-600" />
        ) : null}
        {task.deadline ? (
          <Field label="Deadline" value={task.deadline} icon={<Calendar {...ATTRIBUTE_ICON} />} tone="text-amber-600" />
        ) : null}
        {task.itemToBuy ? (
          <Field label="To buy" value={task.itemToBuy} icon={<ShoppingCart {...ATTRIBUTE_ICON} />} tone="text-emerald-600" />
        ) : null}
        {task.material ? (
          <Field label="Material" value={task.material} icon={<Package {...ATTRIBUTE_ICON} />} tone="text-orange-600" />
        ) : null}
        {task.equipment ? (
          <Field label="Equipment" value={task.equipment} icon={<Wrench {...ATTRIBUTE_ICON} />} tone="text-violet-600" />
        ) : null}
      </dl>
    </div>
  );
}

type TaskAttribute = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  tone: string;
};

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

function Field({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        <span className={tone}>{icon}</span>
        {label}
      </dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
