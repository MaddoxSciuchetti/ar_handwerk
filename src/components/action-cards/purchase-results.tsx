import type { PurchaseSearchListing } from "@/lib/tasks";
import { tavilySearchDomains } from "@/lib/tavily";

export function PurchaseResults({
  query,
  tavilyQuery,
  searchDepth,
  answer,
  retailerSearches,
  placeholder,
  listings,
}: {
  query: string;
  tavilyQuery: string;
  searchDepth: "basic" | "advanced";
  answer?: string | null;
  retailerSearches?: {
    domain: string;
    query: string;
    found: boolean;
    price: string | null;
  }[];
  placeholder: boolean;
  listings: PurchaseSearchListing[];
}) {
  const pricedListings = listings.filter((listing) => listing.price);
  const searchCount = retailerSearches?.length ?? tavilySearchDomains().length;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg bg-zinc-50 px-2.5 py-2">
      <p className="text-[11px] font-medium text-zinc-700">
        {pricedListings.length > 0 ? `Prices for “${query}”` : `Results for “${query}”`}
      </p>

      {answer ? (
        <p className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-[11px] leading-relaxed text-emerald-900">
          {answer}
        </p>
      ) : null}

      {placeholder ? (
        <p className="text-[10px] text-amber-700">
          Placeholder results — set TAVILY_API_KEY for live search.
        </p>
      ) : (
        <p className="text-[10px] text-zinc-400">
          Queried {searchCount} shops in parallel.
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        {listings.map((listing) => (
          <li
            key={`${listing.source}-${listing.url}`}
            className="flex items-start justify-between gap-2 border-t border-zinc-100 pt-1.5 first:border-0 first:pt-0"
          >
            <div className="min-w-0 flex-1">
              <a
                href={listing.url}
                target="_blank"
                rel="noreferrer"
                className="line-clamp-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-900 hover:underline"
              >
                {listing.source}
              </a>
              <p className="line-clamp-1 text-[10px] text-zinc-400">{listing.title}</p>
            </div>
            {listing.price ? (
              <span className="shrink-0 text-[11px] font-semibold text-emerald-700">
                {listing.price}
              </span>
            ) : (
              <span className="shrink-0 text-[10px] text-zinc-400">No price</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
