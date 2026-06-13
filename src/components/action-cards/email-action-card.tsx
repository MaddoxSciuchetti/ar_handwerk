"use client";

import { ActionCardShell, type ActionCardProps } from "@/components/action-cards/action-card-shell";

export function EmailActionCard({
  action,
  googleConnected,
  loading,
  onAccept,
  onReject,
}: ActionCardProps) {
  const draft = action.emailDraft;

  if (!draft) return null;

  return (
    <ActionCardShell
      title={action.title}
      reasoning={action.reasoning}
      acceptLabel="Send"
      onAccept={onAccept}
      onReject={onReject}
      acceptDisabled={!googleConnected}
      loading={loading}
      loadingLabel="Sending…"
    >
      <div className="flex flex-col gap-1.5 rounded-md border border-zinc-100 bg-zinc-50 p-2">
        <div className="grid gap-1 text-[11px]">
          <div className="flex gap-2">
            <span className="w-12 shrink-0 text-zinc-400">To</span>
            <span className="font-medium text-zinc-800">{draft.to}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-12 shrink-0 text-zinc-400">Subject</span>
            <span className="font-medium text-zinc-800">{draft.subject}</span>
          </div>
        </div>
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded border border-zinc-100 bg-white p-2 text-[11px] leading-relaxed text-zinc-700">
          {draft.body}
        </pre>
      </div>
      {!googleConnected ? (
        <p className="text-[11px] text-amber-700">
          Connect Google in Settings to send this email.
        </p>
      ) : null}
    </ActionCardShell>
  );
}
