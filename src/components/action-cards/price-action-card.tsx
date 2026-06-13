"use client";

import { PurchaseResults } from "@/components/action-cards/purchase-results";
import { ActionCardShell, type ActionCardProps } from "@/components/action-cards/action-card-shell";

export function PriceActionCard({
  action,
  loading,
  onAccept,
  onReject,
  onContinue,
  showContinue,
}: ActionCardProps & {
  onContinue?: () => void;
  showContinue?: boolean;
}) {
  const draft = action.priceDraft;
  const results = action.executionResult?.purchaseSearch;

  if (!draft) return null;

  return (
    <ActionCardShell
      title={action.title}
      reasoning={action.reasoning}
      acceptLabel="Look up price"
      onAccept={onAccept}
      onReject={onReject}
      loading={loading}
      loadingLabel="Searching shops…"
      extraActions={
        showContinue ? (
          <button type="button" onClick={onContinue} className="btn-secondary">
            Continue
          </button>
        ) : undefined
      }
      acceptDisabled={showContinue}
    >
      <div className="rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-2">
        <p className="text-[11px] text-zinc-600">
          Search query: <span className="font-medium text-zinc-900">{draft.query}</span>
        </p>
      </div>
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
    </ActionCardShell>
  );
}
