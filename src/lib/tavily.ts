/**
 * Tavily web search client for finding purchase prices.
 *
 * Runs one Tavily search per retailer in parallel so each shop gets a focused
 * query instead of one broad search that returns duplicate pages.
 *
 * @see https://docs.tavily.com/documentation/best-practices/best-practices-search
 */

import type { Task } from "@/lib/tasks";
import { buildPurchaseSearchQuery } from "@/lib/tasks";
import { tradePartnerSearchDomains } from "@/lib/integrations/catalog";

const TAVILY_API_URL = "https://api.tavily.com/search";
const MIN_RELEVANCE_SCORE = 0.3;
const RESULTS_PER_RETAILER = 3;

const GENERAL_RETAILER_DOMAINS = [
  "bauhaus.de",
  "obi.de",
  "hornbach.de",
  "amazon.de",
  "sanitaer-schnell.de",
  "reuter.de",
];

const LISTING_PAGE_PATTERNS = [
  /\/search\b/i,
  /[?&]k=/i,
  /\/s\?/i,
  /\/c\//i,
  /\/category\b/i,
  /\/kategorie\b/i,
];

const PRODUCT_PAGE_PATTERNS = [
  /\/dp\//i,
  /\/gp\/product\//i,
  /\/p\//i,
  /\/produkt\//i,
  /\/artikel\//i,
  /\/product\//i,
];

export function tavilySearchDomains(): string[] {
  return [...tradePartnerSearchDomains(), ...GENERAL_RETAILER_DOMAINS];
}

export type TavilySearchListing = {
  title: string;
  url: string;
  price: string | null;
  snippet: string;
  source: string;
  relevanceScore: number;
};

export type TavilyRetailerSearchMeta = {
  domain: string;
  query: string;
  found: boolean;
  price: string | null;
};

export type TavilySearchResult = {
  query: string;
  /** Base item query shared across retailer searches. */
  tavilyQuery: string;
  searchDepth: "basic" | "advanced";
  answer: string | null;
  listings: TavilySearchListing[];
  retailerSearches: TavilyRetailerSearchMeta[];
  placeholder: boolean;
  searchedAt: string;
};

type TavilyApiResult = {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
};

type TavilyApiResponse = {
  query?: string;
  answer?: string;
  results?: TavilyApiResult[];
};

const PLACEHOLDER_RETAILERS = [
  { source: "Bauhaus", domain: "bauhaus.de", priceRange: [8, 45] },
  { source: "OBI", domain: "obi.de", priceRange: [7, 42] },
  { source: "Hornbach", domain: "hornbach.de", priceRange: [9, 48] },
  { source: "Amazon.de", domain: "amazon.de", priceRange: [6, 55] },
] as const;

/** Base product query (retailer name appended per shop). */
export function buildTavilyApiQuery(task: Task): string {
  const item = localizeItemQuery(task.itemToBuy?.trim() ?? "");

  return [
    `"${item}"`,
    "kaufen Einzelpreis EUR",
    "Produktseite",
    "Sanitär Heizung Ersatzteil",
  ].join(" ");
}

export function buildTavilyApiQueryForRetailer(task: Task, domain: string): string {
  const base = buildTavilyApiQuery(task);
  const retailer = retailerLabel(domain);

  return `${base} ${retailer} Deutschland`;
}

function localizeItemQuery(item: string): string {
  return item
    .replace(/\bcopper pipe fitting\b/gi, "Kupferrohr Fitting")
    .replace(/\bcopper pipe\b/gi, "Kupferrohr")
    .replace(/\bpipe fitting\b/gi, "Rohrfitting")
    .replace(/\bfitting\b/gi, "Fitting");
}

function extractPrices(text: string): number[] {
  const patterns = [
    /(?:€|EUR)\s*(\d{1,4}(?:[.,]\d{2})?)/gi,
    /(\d{1,4}(?:[.,]\d{2})?)\s*(?:€|EUR)/gi,
  ];

  const values: number[] = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1] ?? "";
      const normalized = raw.replace(",", ".");
      const value = Number.parseFloat(normalized.replace(/[^\d.]/g, ""));
      if (Number.isFinite(value) && value > 0 && value < 10_000) {
        values.push(value);
      }
    }
  }

  return values;
}

function formatEuro(value: number): string {
  return `€${value.toFixed(2)}`;
}

function parseEuro(price: string | null): number | null {
  if (!price) return null;
  const value = Number.parseFloat(price.replace(/[^\d.]/g, ""));
  return Number.isFinite(value) ? value : null;
}

function pickBestPrice(text: string): string | null {
  const values = extractPrices(text);
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const nearMedian = sorted.filter(
    (value) => value >= median * 0.5 && value <= median * 2,
  );

  return formatEuro(nearMedian[0] ?? median);
}

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Web";
  }
}

function retailerLabel(hostname: string): string {
  const labels: Record<string, string> = {
    "amazon.de": "Amazon",
    "obi.de": "OBI",
    "bauhaus.de": "Bauhaus",
    "hornbach.de": "Hornbach",
    "baer-ollenroth.de": "Bär und Ollenroth",
    "vaillant.de": "Vaillant",
    "bucher.de": "Bucher KG",
    "reisser.de": "REISSER",
    "peter-jensen.de": "Peter Jensen",
    "sanitaer-schnell.de": "Sanitär Schnell",
    "reuter.de": "Reuter",
  };

  return labels[hostname] ?? hostname;
}

function isListingPage(url: string): boolean {
  return LISTING_PAGE_PATTERNS.some((pattern) => pattern.test(url));
}

function isProductPage(url: string): boolean {
  return PRODUCT_PAGE_PATTERNS.some((pattern) => pattern.test(url));
}

function isOnRetailerDomain(url: string, domain: string): boolean {
  const host = hostnameFromUrl(url);
  return host === domain || host.endsWith(`.${domain}`);
}

function resultRank(result: TavilyApiResult): number {
  const url = result.url ?? "";
  const score = result.score ?? 0;
  let rank = score;

  if (isProductPage(url)) rank += 0.25;
  if (isListingPage(url)) rank -= 0.35;

  return rank;
}

function pickBestResult(results: TavilyApiResult[], domain: string): TavilyApiResult | null {
  const onDomain = results.filter(
    (result) =>
      Boolean(result.url) &&
      isOnRetailerDomain(result.url ?? "", domain) &&
      (result.score ?? 0) >= MIN_RELEVANCE_SCORE,
  );

  if (onDomain.length === 0) return null;

  return onDomain.sort((a, b) => resultRank(b) - resultRank(a))[0] ?? null;
}

function mapApiResult(result: TavilyApiResult, domain: string): TavilySearchListing {
  const snippet = result.content?.trim() ?? "";
  const title = result.title?.trim() ?? "Listing";
  const url = result.url?.trim() ?? "#";

  return {
    title,
    url,
    price: pickBestPrice(`${title} ${snippet}`),
    snippet,
    source: retailerLabel(domain),
    relevanceScore: result.score ?? 0,
  };
}

function buildSummaryAnswer(listings: TavilySearchListing[]): string | null {
  const priced = listings.filter((listing) => listing.price);
  if (priced.length === 0) return null;

  const sorted = [...priced].sort(
    (a, b) => (parseEuro(a.price) ?? Infinity) - (parseEuro(b.price) ?? Infinity),
  );
  const cheapest = sorted[0];
  const highest = sorted[sorted.length - 1];

  if (!cheapest?.price) return null;

  if (priced.length === 1) {
    return `Found a price at ${cheapest.source}: ${cheapest.price}.`;
  }

  if (cheapest.price === highest?.price) {
    return `Found ${priced.length} retailers at ${cheapest.price}.`;
  }

  return `Compared ${priced.length} retailers — from ${cheapest.price} (${cheapest.source}) to ${highest?.price} (${highest?.source}).`;
}

function formatPlaceholderPrice(min: number, max: number, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  }
  const span = max - min;
  const value = min + (hash % (span * 100 + 1)) / 100;
  return `€${value.toFixed(2)}`;
}

function buildPlaceholderResults(query: string): {
  listings: TavilySearchListing[];
  retailerSearches: TavilyRetailerSearchMeta[];
} {
  const listings = PLACEHOLDER_RETAILERS.map((retailer) => {
    const slug = query.toLowerCase().replace(/\s+/g, "-");
    const price = formatPlaceholderPrice(
      retailer.priceRange[0],
      retailer.priceRange[1],
      `${query}-${retailer.source}`,
    );

    return {
      title: `${query} — ${retailer.source}`,
      url: `https://example.com/placeholder/${retailer.source.toLowerCase()}/${slug}`,
      price,
      snippet: `Placeholder listing for "${query}" at ${retailer.source}.`,
      source: retailer.source,
      relevanceScore: 1,
    };
  });

  const retailerSearches = PLACEHOLDER_RETAILERS.map((retailer) => ({
    domain: retailer.domain,
    query: `${query} ${retailer.source} Deutschland`,
    found: true,
    price: listings.find((listing) => listing.source === retailer.source)?.price ?? null,
  }));

  return { listings, retailerSearches };
}

async function searchSingleRetailer(
  apiKey: string,
  domain: string,
  query: string,
): Promise<{
  meta: TavilyRetailerSearchMeta;
  listing: TavilySearchListing | null;
}> {
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: RESULTS_PER_RETAILER,
        chunks_per_source: 1,
        include_answer: false,
        include_domains: [domain],
        country: "germany",
      }),
    });

    if (!response.ok) {
      return {
        meta: { domain, query, found: false, price: null },
        listing: null,
      };
    }

    const data = (await response.json()) as TavilyApiResponse;
    const best = pickBestResult(data.results ?? [], domain);

    if (!best) {
      return {
        meta: { domain, query, found: false, price: null },
        listing: null,
      };
    }

    const listing = mapApiResult(best, domain);

    return {
      meta: {
        domain,
        query,
        found: true,
        price: listing.price,
      },
      listing,
    };
  } catch {
    return {
      meta: { domain, query, found: false, price: null },
      listing: null,
    };
  }
}

async function searchAllRetailers(
  task: Task,
  domains: string[],
): Promise<{
  listings: TavilySearchListing[];
  retailerSearches: TavilyRetailerSearchMeta[];
}> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const searches = domains.map((domain) => {
    const query = buildTavilyApiQueryForRetailer(task, domain);
    return searchSingleRetailer(apiKey, domain, query);
  });

  const results = await Promise.all(searches);

  const listings = results
    .map((result) => result.listing)
    .filter((listing): listing is TavilySearchListing => listing !== null)
    .sort(
      (a, b) => (parseEuro(a.price) ?? Infinity) - (parseEuro(b.price) ?? Infinity),
    );

  return {
    listings,
    retailerSearches: results.map((result) => result.meta),
  };
}

/**
 * Search the web for an item — one Tavily call per retailer.
 * Falls back to placeholder listings when no API key is configured.
 */
export async function searchItemPricesForTask(
  task: Task,
  queryOverride?: string,
): Promise<TavilySearchResult> {
  const effectiveTask = queryOverride ? { ...task, itemToBuy: queryOverride } : task;
  const displayQuery = queryOverride?.trim() || buildPurchaseSearchQuery(task);
  const tavilyQuery = buildTavilyApiQuery(effectiveTask);
  const domains = tavilySearchDomains();

  if (!displayQuery.trim()) {
    throw new Error("A search query is required");
  }

  const searchDepth = "advanced" as const;
  const hasApiKey = Boolean(process.env.TAVILY_API_KEY?.trim());

  if (!hasApiKey) {
    const placeholder = buildPlaceholderResults(displayQuery);

    return {
      query: displayQuery,
      tavilyQuery,
      searchDepth,
      answer: buildSummaryAnswer(placeholder.listings),
      listings: placeholder.listings,
      retailerSearches: placeholder.retailerSearches,
      placeholder: true,
      searchedAt: new Date().toISOString(),
    };
  }

  const { listings, retailerSearches } = await searchAllRetailers(effectiveTask, domains);

  return {
    query: displayQuery,
    tavilyQuery,
    searchDepth,
    answer: buildSummaryAnswer(listings),
    listings,
    retailerSearches,
    placeholder: false,
    searchedAt: new Date().toISOString(),
  };
}
