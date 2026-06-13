"use client";

import type { ReactNode } from "react";
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
          <Field label="Assignee" value={task.assignee} icon={<PersonIcon />} tone="text-sky-600" />
        ) : null}
        {task.location ? (
          <Field label="Location" value={task.location} icon={<LocationIcon />} tone="text-rose-600" />
        ) : null}
        {task.deadline ? (
          <Field label="Deadline" value={task.deadline} icon={<DeadlineIcon />} tone="text-amber-600" />
        ) : null}
        {task.itemToBuy ? (
          <Field label="To buy" value={task.itemToBuy} icon={<PurchaseIcon />} tone="text-emerald-600" />
        ) : null}
        {task.material ? (
          <Field label="Material" value={task.material} icon={<MaterialIcon />} tone="text-orange-600" />
        ) : null}
        {task.equipment ? (
          <Field label="Equipment" value={task.equipment} icon={<EquipmentIcon />} tone="text-violet-600" />
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
      icon: <PersonIcon />,
      tone: "text-sky-600",
    });
  }
  if (task.location) {
    attributes.push({
      key: "location",
      label: "Location",
      value: task.location,
      icon: <LocationIcon />,
      tone: "text-rose-600",
    });
  }
  if (task.deadline) {
    attributes.push({
      key: "deadline",
      label: "Deadline",
      value: task.deadline,
      icon: <DeadlineIcon />,
      tone: "text-amber-600",
    });
  }
  if (task.itemToBuy) {
    attributes.push({
      key: "itemToBuy",
      label: "To buy",
      value: task.itemToBuy,
      icon: <PurchaseIcon />,
      tone: "text-emerald-600",
    });
  }
  if (task.material) {
    attributes.push({
      key: "material",
      label: "Material",
      value: task.material,
      icon: <MaterialIcon />,
      tone: "text-orange-600",
    });
  }
  if (task.equipment) {
    attributes.push({
      key: "equipment",
      label: "Equipment",
      value: task.equipment,
      icon: <EquipmentIcon />,
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

function PersonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21a8 8 0 00-16 0M12 11a4 4 0 100-8 4 4 0 000 8z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function DeadlineIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3v3M17 3v3M4 8h16M6 6h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PurchaseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9h-12L6 6zM6 6l-1-3H3M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MaterialIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 8l-9-5-9 5 9 5 9-5zM3 10.5V17l9 5 9-5v-6.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EquipmentIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.1 2.1-3.3-3.3 2.1-2.1z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
