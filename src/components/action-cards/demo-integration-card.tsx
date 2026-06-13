"use client";

import { INTEGRATIONS } from "@/lib/integrations/catalog";
import { ActionCardShell, type ActionCardProps } from "@/components/action-cards/action-card-shell";

export function DemoIntegrationCard({
  action,
  loading,
  onAccept,
  onReject,
}: ActionCardProps) {
  const integration = INTEGRATIONS.find((i) => i.id === action.integrationId);

  return (
    <ActionCardShell
      title={action.title}
      reasoning={action.reasoning}
      acceptLabel="Accept"
      onAccept={onAccept}
      onReject={onReject}
      loading={loading}
      loadingLabel="Finishing…"
    >
      <div className="flex items-start gap-2.5 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
          style={{ backgroundColor: integration?.brandColor ?? "#71717a" }}
        >
          {integration?.brandLabel ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-zinc-900">
            {integration?.name ?? action.integrationLabel}
          </p>
          {action.demoDescription ? (
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-600">
              {action.demoDescription}
            </p>
          ) : null}
          <p className="mt-1 text-[10px] text-zinc-400">Demo integration — no live API call.</p>
        </div>
      </div>
    </ActionCardShell>
  );
}
