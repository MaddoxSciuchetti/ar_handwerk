import type { ProposedAction } from "@/lib/actions/types";

function stepLabel(action: ProposedAction, status: ProposedAction["status"]): string {
  if (status === "done") {
    if (action.type === "email") return "Email sent";
    if (action.type === "calendar") return "On calendar";
    if (action.type === "price_search") return "Price looked up";
    return `Finished — ${action.integrationLabel ?? action.title}`;
  }
  if (status === "rejected") {
    if (action.type === "email") return "Email skipped";
    if (action.type === "calendar") return "Calendar skipped";
    if (action.type === "price_search") return "Price skipped";
    return "Skipped";
  }
  return action.title;
}

export function ActionStepProgress({
  actions,
  currentStep,
}: {
  actions: ProposedAction[];
  currentStep: number;
}) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        Actions · Step {Math.min(currentStep + 1, actions.length)} of {actions.length}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {actions.map((action, index) => {
          const isCurrent = index === currentStep;
          const isDone = action.status === "done";
          const isRejected = action.status === "rejected";
          const isPast = index < currentStep || isDone || isRejected;

          return (
            <li
              key={action.id}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isCurrent && !isPast
                  ? "bg-zinc-900 text-white"
                  : isDone
                    ? "bg-emerald-50 text-emerald-700"
                    : isRejected
                      ? "bg-zinc-100 text-zinc-400"
                      : "bg-zinc-50 text-zinc-400"
              }`}
            >
              <span aria-hidden>
                {isDone ? "✓" : isRejected ? "—" : isCurrent ? "●" : "○"}
              </span>
              <span className="max-w-[8rem] truncate">
                {isPast ? stepLabel(action, action.status) : action.title}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
