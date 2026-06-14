"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ActionCardContent } from "@/components/action-cards/action-card-content";
import { SwipeableCard } from "@/components/swipeable-card";
import type { ProposedAction } from "@/lib/actions/types";
import type { TaskActionResult } from "@/lib/integrations/types";
import type { Task } from "@/lib/tasks";

type ActionFlowProps = {
  task: Task;
  googleConnected?: boolean;
  keyboardEnabled?: boolean;
  variant?: "default" | "focus";
  onTaskUpdate?: (task: Task) => void;
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function patchAction(task: Task, actionId: string, patch: Partial<ProposedAction>) {
  return (task.proposedActions ?? []).map((a) =>
    a.id === actionId ? { ...a, ...patch } : a,
  );
}

function ActionStepShell({
  isFocus,
  className = "",
  children,
}: {
  isFocus: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (isFocus) {
    return <div className={className}>{children}</div>;
  }

  return <div className={`action-step-card flex min-h-0 flex-col p-4 ${className}`.trim()}>{children}</div>;
}

export function ActionFlow({
  task,
  googleConnected,
  keyboardEnabled,
  variant = "default",
  onTaskUpdate,
}: ActionFlowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceReady, setPriceReady] = useState(false);
  const [emailDraft, setEmailDraft] = useState(
    () => task.proposedActions?.find((a) => a.type === "email")?.emailDraft,
  );
  const [calendarDraft, setCalendarDraft] = useState(
    () => task.proposedActions?.find((a) => a.type === "calendar")?.calendarDraft,
  );

  const actions = task.proposedActions ?? [];
  const step = task.actionFlowStep ?? 0;
  const current = actions[step];
  const done = step >= actions.length;

  const advance = useCallback(
    (updated: ProposedAction[]) => {
      onTaskUpdate?.({ ...task, proposedActions: updated, actionFlowStep: step + 1 });
      setPriceReady(false);
      setError(null);
    },
    [onTaskUpdate, step, task],
  );

  const reject = useCallback(() => {
    if (!current) return;
    advance(patchAction(task, current.id, { status: "rejected" }));
  }, [advance, current, task]);

  const skip = useCallback(() => {
    if (!current || loading) return;
    advance(patchAction(task, current.id, { status: "skipped" }));
  }, [advance, current, loading, task]);

  const accept = useCallback(async () => {
    if (!current) return;

    if (current.type === "price_search" && priceReady) {
      advance(task.proposedActions ?? []);
      return;
    }

    if (current.type === "demo_integration") {
      advance(patchAction(task, current.id, { status: "done" }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (current.type === "email" && current.emailDraft) {
        const draft = emailDraft ?? current.emailDraft;
        const res = await fetch("/api/tasks/actions/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, to: draft.to, subject: draft.subject, body: draft.body }),
        });
        const data = (await res.json()) as TaskActionResult & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Email failed");

        const updated = patchAction(task, current.id, { status: "done" });
        onTaskUpdate?.({
          ...task,
          integrations: { ...task.integrations, gmailMessageId: data.gmailMessageId },
          proposedActions: updated,
          actionFlowStep: step + 1,
        });
        setError(null);
        return;
      }

      if (current.type === "calendar") {
        const draft = calendarDraft ?? current.calendarDraft;
        if (!draft) {
          throw new Error("Calendar details are missing for this action");
        }

        const res = await fetch("/api/tasks/actions/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task,
            summary: draft.summary,
            location: draft.location,
            start: draft.start,
            end: draft.end,
            description: draft.description,
          }),
        });
        const data = (await res.json()) as TaskActionResult & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Calendar failed");

        const updated = patchAction(task, current.id, { status: "done" });
        onTaskUpdate?.({
          ...task,
          integrations: {
            ...task.integrations,
            calendarEventId: data.calendarEventId,
            calendarLink: data.calendarLink,
            calendarAccount: data.calendarAccount ?? task.integrations?.calendarAccount,
            calendarStart: data.calendarStart ?? draft.start ?? undefined,
            calendarEnd: data.calendarEnd ?? draft.end ?? undefined,
            calendarSummary: draft.summary,
            calendarLocation: draft.location,
          },
          proposedActions: updated,
          actionFlowStep: step + 1,
        });
        return;
      }

      if (current.type === "price_search" && current.priceDraft) {
        const res = await fetch("/api/tasks/actions/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task, query: current.priceDraft.query }),
        });
        const data = (await res.json()) as TaskActionResult & { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Search failed");
        if (!data.purchaseSearch) throw new Error("No results");

        const updated = patchAction(task, current.id, {
          status: "done",
          executionResult: { purchaseSearch: data.purchaseSearch },
        });
        onTaskUpdate?.({
          ...task,
          integrations: { ...task.integrations, purchaseSearch: data.purchaseSearch },
          proposedActions: updated,
        });
        setPriceReady(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }, [
    advance,
    calendarDraft,
    current,
    emailDraft,
    onTaskUpdate,
    priceReady,
    step,
    task,
  ]);

  const needsGoogle =
    Boolean(current) &&
    (current.type === "email" || current.type === "calendar") &&
    !googleConnected;
  const acceptLabel =
    current?.type === "price_search" && priceReady
      ? "Continue"
      : current?.type === "email"
        ? "Send"
        : "Accept";
  const acceptDisabled = loading || needsGoogle;
  const isFocus = variant === "focus";
  const canSwipe = isFocus && !loading;

  const actionBody = (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <p className="mb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {step + 1} of {actions.length}
        </p>
        <h4 className="mb-2 shrink-0 text-[14px] font-semibold leading-snug text-zinc-900">
          {current?.title}
        </h4>
        {current?.reasoning ? (
          <p className="mb-3 shrink-0 text-[11px] leading-relaxed text-zinc-500">{current.reasoning}</p>
        ) : null}
        {current ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <ActionCardContent
              action={current}
              googleConnected={googleConnected}
              emailDraft={emailDraft ?? current.emailDraft}
              onEmailDraftChange={setEmailDraft}
              calendarDraft={calendarDraft ?? current.calendarDraft}
              onCalendarDraftChange={setCalendarDraft}
            />
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-2 shrink-0 text-[11px] text-red-600">{error}</p> : null}

      <div
        className={`mt-3 shrink-0 ${
          isFocus ? "flex items-center justify-center gap-3 pt-1" : "grid grid-cols-3 gap-2"
        }`}
      >
        <button
          type="button"
          onClick={reject}
          disabled={loading}
          className={
            isFocus
              ? "flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-200 bg-white text-red-500 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
              : "flex items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          }
          title="Reject"
          aria-label="Reject"
        >
          {isFocus ? (
            <span className="text-xl leading-none" aria-hidden>
              ✕
            </span>
          ) : (
            <>
              Reject
              <kbd className="rounded border border-white/25 bg-white/15 px-1.5 py-0.5 text-[10px] font-normal leading-none">
                Q
              </kbd>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={loading}
          title="Skip this action and move to the next one"
          className={
            isFocus
              ? "flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-[11px] font-semibold text-zinc-500 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
              : "focus-ring rounded-full border border-zinc-200 bg-white px-3 py-2.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
          }
          aria-label="Skip"
        >
          {isFocus ? "Skip" : "Skip"}
        </button>
        <button
          type="button"
          onClick={() => void accept()}
          disabled={acceptDisabled}
          className={
            isFocus
              ? "flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-200 bg-white text-emerald-600 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
              : "flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          }
          title={acceptLabel}
          aria-label={acceptLabel}
        >
          {loading ? (
            <span className="text-[10px] font-semibold">…</span>
          ) : isFocus ? (
            <span className="text-xl leading-none" aria-hidden>
              ✓
            </span>
          ) : (
            <>
              {acceptLabel}
              <kbd className="rounded border border-white/25 bg-white/15 px-1.5 py-0.5 text-[10px] font-normal leading-none">
                Enter
              </kbd>
            </>
          )}
        </button>
      </div>

      {isFocus ? (
        <p className="mt-2 shrink-0 text-center text-[10px] text-zinc-400">
          Drag left to reject · drag right to accept
        </p>
      ) : null}
    </>
  );

  useEffect(() => {
    if (!keyboardEnabled || done || !current) return;

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      if (event.key === "Enter") {
        if (acceptDisabled) return;
        event.preventDefault();
        void accept();
        return;
      }

      if (event.key === "q" || event.key === "Q") {
        if (loading) return;
        event.preventDefault();
        reject();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [accept, acceptDisabled, current, done, keyboardEnabled, loading, reject, skip]);

  if (actions.length === 0) {
    return (
      <ActionStepShell
        isFocus={isFocus}
        className={`items-center justify-center ${isFocus ? "h-full bg-white p-6 pt-10" : "min-h-[20rem]"}`}
      >
        <p className="text-[11px] text-zinc-400">Planning actions…</p>
      </ActionStepShell>
    );
  }

  if (done) {
    return (
      <ActionStepShell
        isFocus={isFocus}
        className={`items-center justify-center ${
          isFocus ? "h-full bg-emerald-50 p-6 pt-10" : "min-h-[20rem] bg-emerald-50"
        }`}
      >
        <p className="text-[12px] font-medium text-emerald-700">All actions complete</p>
      </ActionStepShell>
    );
  }

  if (!current) {
    return <div className="min-h-[20rem] w-full" aria-hidden />;
  }

  if (isFocus) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-10">
        <SwipeableCard
          resetKey={current.id}
          canSwipeLeft={canSwipe}
          canSwipeRight={canSwipe && !acceptDisabled}
          onSwipeLeft={() => reject()}
          onSwipeRight={() => void accept()}
        >
          {actionBody}
        </SwipeableCard>
      </div>
    );
  }

  return (
    <ActionStepShell isFocus={isFocus} className="h-full flex-1">
      {actionBody}
    </ActionStepShell>
  );
}
