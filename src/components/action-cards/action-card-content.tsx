"use client";

import { useMemo, useState } from "react";
import { PurchaseResults } from "@/components/action-cards/purchase-results";
import type { ProposedAction } from "@/lib/actions/types";
import { INTEGRATIONS } from "@/lib/integrations/catalog";

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

type CalendarDraft = {
  summary: string;
  location?: string;
  start: string;
  end: string;
  description?: string;
};

export function ActionCardContent({
  action,
  googleConnected,
  calendarDraft,
  onCalendarDraftChange,
}: {
  action: ProposedAction;
  googleConnected?: boolean;
  calendarDraft?: CalendarDraft;
  onCalendarDraftChange?: (draft: CalendarDraft) => void;
}) {
  if (action.type === "email" && action.emailDraft) {
    const draft = action.emailDraft;
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="grid shrink-0 gap-1 text-[11px]">
          <Row label="To" value={draft.to} />
          <Row label="Subject" value={draft.subject} />
        </div>
        <pre className="min-h-[14rem] flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-50 p-2.5 text-[11px] leading-relaxed text-zinc-700">
          {draft.body}
        </pre>
        {!googleConnected ? (
          <p className="shrink-0 text-[11px] text-amber-700">Connect Google in Settings to send.</p>
        ) : null}
      </div>
    );
  }

  if (action.type === "calendar" && action.calendarDraft) {
    return (
      <CalendarContent
        draft={calendarDraft ?? action.calendarDraft}
        googleConnected={googleConnected}
        onDraftChange={onCalendarDraftChange}
      />
    );
  }

  if (action.type === "price_search" && action.priceDraft) {
    const results = action.executionResult?.purchaseSearch;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-zinc-600">
          Search: <span className="font-medium text-zinc-900">{action.priceDraft.query}</span>
        </p>
        {results ? (
          <PurchaseResults
            query={results.query}
            tavilyQuery={results.tavilyQuery ?? results.query}
            searchDepth={results.searchDepth ?? "advanced"}
            answer={results.answer}
            retailerSearches={results.retailerSearches}
            placeholder={results.placeholder}
            listings={results.listings}
          />
        ) : null}
      </div>
    );
  }

  if (action.type === "demo_integration") {
    const integration = INTEGRATIONS.find((i) => i.id === action.integrationId);
    return (
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
          style={{ backgroundColor: integration?.brandColor ?? "#71717a" }}
        >
          {integration?.brandLabel ?? "?"}
        </span>
        <div>
          <p className="text-[12px] font-semibold text-zinc-900">
            {integration?.name ?? action.integrationLabel}
          </p>
          {action.demoDescription ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
              {action.demoDescription}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}

function CalendarContent({
  draft,
  googleConnected,
  onDraftChange,
}: {
  draft: CalendarDraft;
  googleConnected?: boolean;
  onDraftChange?: (draft: CalendarDraft) => void;
}) {
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);

  const dateLabel = useMemo(
    () =>
      new Date(start).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [start],
  );

  function updateStart(value: string) {
    const next = fromDatetimeLocalValue(value);
    setStart(next);
    onDraftChange?.({ ...draft, start: next, end });
  }

  function updateEnd(value: string) {
    const next = fromDatetimeLocalValue(value);
    setEnd(next);
    onDraftChange?.({ ...draft, start, end: next });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-semibold text-zinc-900">{draft.summary}</p>
      <div className="grid gap-2 text-[11px]">
        <Row label="Date" value={dateLabel} />
        <label className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-zinc-400">Start</span>
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(start)}
            onChange={(e) => updateStart(e.target.value)}
            className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-zinc-400">End</span>
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(end)}
            onChange={(e) => updateEnd(e.target.value)}
            className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1"
          />
        </label>
        {draft.location ? <Row label="Location" value={draft.location} /> : null}
      </div>
      {!googleConnected ? (
        <p className="text-[11px] text-amber-700">Connect Google in Settings to add events.</p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-14 shrink-0 text-zinc-400">{label}</span>
      <span className="font-medium text-zinc-800">{value}</span>
    </div>
  );
}
