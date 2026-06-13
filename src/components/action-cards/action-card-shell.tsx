"use client";

import type { ProposedAction } from "@/lib/actions/types";

export function ActionCardShell({
  title,
  reasoning,
  children,
  onAccept,
  onReject,
  acceptLabel = "Accept",
  rejectLabel = "Reject",
  acceptDisabled,
  loading,
  loadingLabel = "Working…",
  extraActions,
}: {
  title: string;
  reasoning?: string;
  children: React.ReactNode;
  onAccept: () => void;
  onReject: () => void;
  acceptLabel?: string;
  rejectLabel?: string;
  acceptDisabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  extraActions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-2.5 shadow-sm">
      <div>
        <p className="text-[12px] font-semibold text-zinc-900">{title}</p>
        {reasoning ? <p className="mt-0.5 text-[11px] text-zinc-500">{reasoning}</p> : null}
      </div>
      {children}
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {extraActions}
        <button type="button" onClick={onReject} disabled={loading} className="btn-secondary">
          {rejectLabel}
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={acceptDisabled || loading}
          className="btn-primary"
        >
          {loading ? loadingLabel : acceptLabel}
        </button>
      </div>
    </div>
  );
}

export type ActionCardProps = {
  action: ProposedAction;
  googleConnected?: boolean;
  loading?: boolean;
  onAccept: () => void;
  onReject: () => void;
};
