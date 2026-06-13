"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionCardContent } from "@/components/action-cards/action-card-content";
import { ActionCardStack } from "@/components/action-card-stack";
import type { ProposedAction } from "@/lib/actions/types";
import type { TaskActionResult } from "@/lib/integrations/types";
import type { Task } from "@/lib/tasks";

type ActionFlowProps = {
  task: Task;
  googleConnected?: boolean;
  keyboardEnabled?: boolean;
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

export function ActionFlow({
  task,
  googleConnected,
  keyboardEnabled,
  onTaskUpdate,
}: ActionFlowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceReady, setPriceReady] = useState(false);
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
        const draft = current.emailDraft;
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
        if (!draft) return;

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
            calendarStart: data.calendarStart ?? draft.start,
            calendarEnd: data.calendarEnd ?? draft.end,
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
  const acceptDisabled = loading || (needsGoogle && !priceReady);

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
      <div className="flex h-full min-h-80 items-center justify-center">
        <p className="text-[11px] text-zinc-400">Planning actions…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-full min-h-80 items-center justify-center rounded-xl bg-emerald-50">
        <p className="text-[12px] font-medium text-emerald-700">All actions complete</p>
      </div>
    );
  }

  if (!current) {
    return <div className="min-h-80 w-full" aria-hidden />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ActionCardStack actions={actions} step={step}>
          <p className="mb-2 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {step + 1} of {actions.length}
          </p>
          <h4 className="mb-3 shrink-0 text-[13px] font-semibold text-zinc-900">{current.title}</h4>
          {current.reasoning ? (
            <p className="mb-3 shrink-0 text-[11px] text-zinc-500">{current.reasoning}</p>
          ) : null}
          <div className="flex min-h-0 flex-1 flex-col">
            <ActionCardContent
              action={current}
              googleConnected={googleConnected}
              calendarDraft={calendarDraft ?? current.calendarDraft}
              onCalendarDraftChange={setCalendarDraft}
            />
          </div>
        </ActionCardStack>
      </div>

      {error ? <p className="shrink-0 text-[11px] text-red-600">{error}</p> : null}

      <div className="grid shrink-0 grid-cols-3 gap-2">
        <button
          type="button"
          onClick={reject}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-red-500 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
        >
          Reject
          <kbd className="rounded border border-white/25 bg-white/15 px-1.5 py-0.5 text-[10px] font-normal leading-none">
            Q
          </kbd>
        </button>
        <button
          type="button"
          onClick={skip}
          disabled={loading}
          title="Skip this action and move to the next one"
          className="focus-ring rounded-full border border-zinc-200 bg-white px-3 py-2.5 text-[11px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => void accept()}
          disabled={acceptDisabled}
          className="flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? "Working…" : acceptLabel}
          {!loading ? (
            <kbd className="rounded border border-white/25 bg-white/15 px-1.5 py-0.5 text-[10px] font-normal leading-none">
              Enter
            </kbd>
          ) : null}
        </button>
      </div>
    </div>
  );
}
