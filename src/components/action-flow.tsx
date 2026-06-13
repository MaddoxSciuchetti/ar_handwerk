"use client";

import { useCallback, useState } from "react";
import type { ProposedAction } from "@/lib/actions/types";
import { ActionStepProgress } from "@/components/action-step-progress";
import { CalendarActionCard } from "@/components/action-cards/calendar-action-card";
import { DemoIntegrationCard } from "@/components/action-cards/demo-integration-card";
import { EmailActionCard } from "@/components/action-cards/email-action-card";
import { PriceActionCard } from "@/components/action-cards/price-action-card";
import type { TaskActionResult } from "@/lib/integrations/types";
import type { Task } from "@/lib/tasks";

type ActionFlowProps = {
  task: Task;
  googleConnected?: boolean;
  onTaskUpdate?: (task: Task) => void;
};

function allActionsResolved(actions: ProposedAction[], step: number): boolean {
  return step >= actions.length;
}

function patchAction(
  task: Task,
  actionId: string,
  patch: Partial<ProposedAction>,
): ProposedAction[] {
  return (task.proposedActions ?? []).map((action) =>
    action.id === actionId ? { ...action, ...patch } : action,
  );
}

export function ActionFlow({ task, googleConnected, onTaskUpdate }: ActionFlowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceAwaitingContinue, setPriceAwaitingContinue] = useState(false);
  const [calendarDraft, setCalendarDraft] = useState(
    () => task.proposedActions?.find((a) => a.type === "calendar")?.calendarDraft,
  );

  const actions = task.proposedActions ?? [];
  const step = task.actionFlowStep ?? 0;
  const currentAction = actions[step];

  const advance = useCallback(
    (updatedActions: ProposedAction[]) => {
      onTaskUpdate?.({
        ...task,
        proposedActions: updatedActions,
        actionFlowStep: step + 1,
      });
      setPriceAwaitingContinue(false);
      setError(null);
    },
    [onTaskUpdate, step, task],
  );

  const rejectCurrent = useCallback(() => {
    if (!currentAction) return;
    const updated = patchAction(task, currentAction.id, { status: "rejected" });
    advance(updated);
  }, [advance, currentAction, task]);

  const completeDemo = useCallback(() => {
    if (!currentAction) return;
    const updated = patchAction(task, currentAction.id, { status: "done" });
    advance(updated);
  }, [advance, currentAction, task]);

  const acceptEmail = useCallback(async () => {
    if (!currentAction?.emailDraft) return;
    setLoading(true);
    setError(null);
    try {
      const draft = currentAction.emailDraft;
      const response = await fetch("/api/tasks/actions/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
        }),
      });
      const data = (await response.json()) as TaskActionResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Email failed");

      const updated = patchAction(task, currentAction.id, {
        status: "done",
        executionResult: {
          ...task.integrations,
          gmailMessageId: data.gmailMessageId,
        },
      });
      onTaskUpdate?.({
        ...task,
        integrations: { ...task.integrations, gmailMessageId: data.gmailMessageId },
        proposedActions: updated,
        actionFlowStep: step + 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Email failed");
    } finally {
      setLoading(false);
    }
  }, [currentAction, onTaskUpdate, step, task]);

  const acceptCalendar = useCallback(async () => {
    const draft = calendarDraft ?? currentAction?.calendarDraft;
    if (!currentAction || !draft) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tasks/actions/calendar", {
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
      const data = (await response.json()) as TaskActionResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Calendar failed");

      const updated = patchAction(task, currentAction.id, {
        status: "done",
        executionResult: {
          ...task.integrations,
          calendarEventId: data.calendarEventId,
          calendarLink: data.calendarLink,
          calendarStart: data.calendarStart ?? draft.start,
          calendarEnd: data.calendarEnd ?? draft.end,
          calendarSummary: draft.summary,
          calendarLocation: draft.location,
        },
      });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calendar failed");
    } finally {
      setLoading(false);
    }
  }, [calendarDraft, currentAction, onTaskUpdate, step, task]);

  const acceptPrice = useCallback(async () => {
    if (!currentAction?.priceDraft) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tasks/actions/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, query: currentAction.priceDraft.query }),
      });
      const data = (await response.json()) as TaskActionResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Search failed");
      if (!data.purchaseSearch) throw new Error("No search results returned");

      const updated = patchAction(task, currentAction.id, {
        status: "done",
        executionResult: { purchaseSearch: data.purchaseSearch },
      });
      onTaskUpdate?.({
        ...task,
        integrations: { ...task.integrations, purchaseSearch: data.purchaseSearch },
        proposedActions: updated,
      });
      setPriceAwaitingContinue(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [currentAction, onTaskUpdate, task]);

  const continueAfterPrice = useCallback(() => {
    if (!currentAction) return;
    advance(task.proposedActions ?? []);
  }, [advance, currentAction, task.proposedActions]);

  if (actions.length === 0) {
    return (
      <div className="border-t border-zinc-100 pt-2">
        <div className="h-16 animate-pulse rounded-lg bg-zinc-100" />
        <p className="mt-1.5 text-[11px] text-zinc-400">Planning actions…</p>
      </div>
    );
  }

  if (allActionsResolved(actions, step)) {
    return (
      <div className="border-t border-zinc-100 pt-2">
        <ActionStepProgress actions={actions} currentStep={step} />
        <p className="mt-2 rounded-md bg-emerald-50 px-2.5 py-2 text-[11px] font-medium text-emerald-700">
          All actions complete
        </p>
      </div>
    );
  }

  if (!currentAction) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-zinc-100 pt-2">
      <ActionStepProgress actions={actions} currentStep={step} />

      {currentAction.type === "email" ? (
        <EmailActionCard
          action={currentAction}
          googleConnected={googleConnected}
          loading={loading}
          onAccept={() => void acceptEmail()}
          onReject={rejectCurrent}
        />
      ) : null}

      {currentAction.type === "calendar" ? (
        <CalendarActionCard
          action={{
            ...currentAction,
            calendarDraft: calendarDraft ?? currentAction.calendarDraft,
          }}
          googleConnected={googleConnected}
          loading={loading}
          onAccept={() => void acceptCalendar()}
          onReject={rejectCurrent}
          onDraftChange={setCalendarDraft}
        />
      ) : null}

      {currentAction.type === "price_search" ? (
        <PriceActionCard
          action={currentAction}
          loading={loading}
          onAccept={() => void acceptPrice()}
          onReject={rejectCurrent}
          showContinue={priceAwaitingContinue}
          onContinue={continueAfterPrice}
        />
      ) : null}

      {currentAction.type === "demo_integration" ? (
        <DemoIntegrationCard
          action={currentAction}
          loading={loading}
          onAccept={completeDemo}
          onReject={rejectCurrent}
        />
      ) : null}

      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
