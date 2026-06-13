"use client";

import { useMemo, useState } from "react";
import { ActionCardShell, type ActionCardProps } from "@/components/action-cards/action-card-shell";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

export function CalendarActionCard({
  action,
  googleConnected,
  loading,
  onAccept,
  onReject,
  onDraftChange,
}: ActionCardProps & {
  onDraftChange?: (draft: {
    summary: string;
    location?: string;
    start: string;
    end: string;
    description?: string;
  }) => void;
}) {
  const draft = action.calendarDraft;
  const [start, setStart] = useState(draft?.start ?? new Date().toISOString());
  const [end, setEnd] = useState(draft?.end ?? new Date().toISOString());

  const dateLabel = useMemo(() => {
    try {
      return new Date(start).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }, [start]);

  if (!draft) return null;

  function handleStartChange(value: string) {
    setStart(fromDatetimeLocalValue(value));
    onDraftChange?.({
      summary: draft!.summary,
      location: draft!.location,
      start: fromDatetimeLocalValue(value),
      end,
      description: draft!.description,
    });
  }

  function handleEndChange(value: string) {
    setEnd(fromDatetimeLocalValue(value));
    onDraftChange?.({
      summary: draft!.summary,
      location: draft!.location,
      start,
      end: fromDatetimeLocalValue(value),
      description: draft!.description,
    });
  }

  return (
    <ActionCardShell
      title={action.title}
      reasoning={action.reasoning}
      acceptLabel="Add to calendar"
      onAccept={onAccept}
      onReject={onReject}
      acceptDisabled={!googleConnected}
      loading={loading}
      loadingLabel="Creating…"
    >
      <div className="flex flex-col gap-2 rounded-md border border-zinc-100 bg-zinc-50 p-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Event</p>
          <p className="text-[12px] font-semibold text-zinc-900">{draft.summary}</p>
        </div>
        <div className="grid gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-zinc-400">Date</span>
            <span className="font-medium text-zinc-800">{dateLabel}</span>
          </div>
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-zinc-400">Start</span>
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(start)}
              onChange={(e) => handleStartChange(e.target.value)}
              className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-800"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-zinc-400">End</span>
            <input
              type="datetime-local"
              value={toDatetimeLocalValue(end)}
              onChange={(e) => handleEndChange(e.target.value)}
              className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-800"
            />
          </label>
          {draft.location ? (
            <div className="flex items-start gap-2">
              <span className="w-16 shrink-0 text-zinc-400">Location</span>
              <span className="font-medium text-zinc-800">{draft.location}</span>
            </div>
          ) : null}
        </div>
        {draft.description ? (
          <p className="text-[11px] leading-relaxed text-zinc-600">{draft.description}</p>
        ) : null}
      </div>
      {!googleConnected ? (
        <p className="text-[11px] text-amber-700">
          Connect Google in Settings to create calendar events.
        </p>
      ) : null}
    </ActionCardShell>
  );
}
