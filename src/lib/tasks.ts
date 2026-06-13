import type { ProposedAction } from "@/lib/actions/types";

export type TaskStatus = "pending" | "in_progress" | "done";

export type PurchaseSearchListing = {
  title: string;
  url: string;
  price: string | null;
  snippet: string;
  source: string;
};

export type PurchaseSearchResult = {
  /** Human-readable item (+ optional location). */
  query: string;
  /** Base item query sent to each per-retailer Tavily search. */
  tavilyQuery: string;
  searchDepth: "basic" | "advanced";
  /** Tavily LLM summary — usually the best single price estimate. */
  answer?: string | null;
  listings: PurchaseSearchListing[];
  /** One Tavily call per retailer — useful for debugging. */
  retailerSearches?: {
    domain: string;
    query: string;
    found: boolean;
    price: string | null;
  }[];
  placeholder: boolean;
  searchedAt: string;
};

export type TaskIntegrations = {
  calendarEventId?: string;
  calendarLink?: string | null;
  calendarStart?: string;
  calendarEnd?: string;
  calendarSummary?: string;
  calendarLocation?: string;
  gmailMessageId?: string;
  purchaseSearch?: PurchaseSearchResult;
};

/** Raw Pioneer extraction attached to a task for debugging. */
export type TaskPioneerDebug = {
  extractionSource: "service_task" | "entity_fallback";
  serviceTask?: unknown;
  entityMatch?: unknown;
  entities?: unknown;
  pioneerResponse?: unknown;
};

export type Task = {
  id: string;
  title: string;
  problem?: string;
  assignee?: string;
  location?: string;
  deadline?: string;
  /** Item that must be purchased (from Pioneer material/equipment extraction). */
  itemToBuy?: string;
  material?: string;
  equipment?: string;
  status: TaskStatus;
  createdAt: string;
  integrations?: TaskIntegrations;
  /** Pioneer extraction snapshot used to build this task (dev/debug). */
  pioneerDebug?: TaskPioneerDebug;
  /** Ordered action queue: email, calendar, price, then demo integrations. */
  proposedActions?: ProposedAction[];
  /** Current index into proposedActions. */
  actionFlowStep?: number;
};

/** True when the task specifies something that needs to be bought. */
export function taskNeedsPurchase(task: Task): boolean {
  return Boolean(task.itemToBuy?.trim());
}

/** Build a display label for the item to purchase. */
export function buildPurchaseSearchQuery(task: Task): string {
  const item = task.itemToBuy?.trim();
  if (!item) return "";

  const location = task.location?.trim();
  return location ? `${item} — ${location}` : item;
}

type EntityField = { text?: string; confidence?: number } | null;

type PioneerServiceTask = {
  task?: EntityField;
  problem?: EntityField;
  proposed_action?: EntityField;
  material?: EntityField;
  equipment?: EntityField;
  people?: EntityField;
  location?: EntityField;
  deadline?: EntityField;
};

type PioneerEntitySpan = { text?: string; confidence?: number; start?: number; end?: number };

type PioneerEntities = {
  task?: PioneerEntitySpan[];
  problem?: PioneerEntitySpan[];
  people?: PioneerEntitySpan[];
  location?: PioneerEntitySpan[];
  deadline?: PioneerEntitySpan[];
};

type PioneerData = {
  service_task?: PioneerServiceTask[];
  entities?: PioneerEntities;
};

function fieldText(field: EntityField | undefined): string | undefined {
  if (!field) return undefined;
  if (typeof field === "string") return field;
  return field.text;
}

/** Pick the entity span closest to an anchor task mention in the transcript. */
function nearestEntitySpan(
  anchor: PioneerEntitySpan,
  candidates: PioneerEntitySpan[] | undefined,
  maxDistance = 300,
): PioneerEntitySpan | undefined {
  if (anchor.start == null || !candidates?.length) return undefined;

  let best: PioneerEntitySpan | undefined;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const text = candidate.text?.trim();
    if (!text || candidate.start == null) continue;

    const distance = Math.abs(candidate.start - anchor.start);
    if (distance <= maxDistance && distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best;
}

function nearestEntityText(
  anchor: PioneerEntitySpan,
  candidates: PioneerEntitySpan[] | undefined,
  maxDistance = 300,
): string | undefined {
  return nearestEntitySpan(anchor, candidates, maxDistance)?.text?.trim();
}

function parseServiceTaskRows(items: PioneerServiceTask[], pioneerData: PioneerData): Task[] {
  const batchId = Date.now();

  return items.flatMap((item, index) => {
    const title = fieldText(item.task) ?? fieldText(item.proposed_action);
    if (!title?.trim()) return [];

    const material = fieldText(item.material);
    const equipment = fieldText(item.equipment);
    const itemToBuy = material ?? equipment;

    return [
      {
        id: `pioneer-${batchId}-${index}`,
        title: title.trim(),
        problem: fieldText(item.problem),
        assignee: fieldText(item.people),
        location: fieldText(item.location),
        deadline: fieldText(item.deadline),
        material,
        equipment,
        itemToBuy,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        pioneerDebug: {
          extractionSource: "service_task" as const,
          serviceTask: item,
          entities: pioneerData.entities,
          pioneerResponse: pioneerData,
        },
      },
    ];
  });
}

/** Fallback when Pioneer returns entities but no grouped service_task rows. */
function parseEntityFallback(entities: PioneerEntities | undefined, pioneerData: PioneerData): Task[] {
  const batchId = Date.now();
  const taskSpans = (entities?.task ?? []).filter((span) => span.text?.trim());
  if (taskSpans.length === 0) return [];

  return taskSpans.map((taskSpan, index) => ({
    id: `pioneer-entity-${batchId}-${index}`,
    title: taskSpan.text!.trim(),
    problem: nearestEntityText(taskSpan, entities?.problem),
    assignee: nearestEntityText(taskSpan, entities?.people),
    location: nearestEntityText(taskSpan, entities?.location),
    deadline: nearestEntityText(taskSpan, entities?.deadline),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
    pioneerDebug: {
      extractionSource: "entity_fallback" as const,
      entityMatch: {
        task: taskSpan,
        problem: nearestEntitySpan(taskSpan, entities?.problem),
        people: nearestEntitySpan(taskSpan, entities?.people),
        location: nearestEntitySpan(taskSpan, entities?.location),
        deadline: nearestEntitySpan(taskSpan, entities?.deadline),
      },
      entities,
      pioneerResponse: pioneerData,
    },
  }));
}

/**
 * Turn Pioneer extraction JSON into task widgets.
 * Prefers grouped service_task rows; falls back to flat task entities.
 */
export function parsePioneerTasks(data: unknown): Task[] {
  const parsed = data as PioneerData;
  const fromStructures = parseServiceTaskRows(parsed?.service_task ?? [], parsed);
  if (fromStructures.length > 0) return fromStructures;
  return parseEntityFallback(parsed?.entities, parsed);
}

export const SAMPLE_TASKS: Task[] = [
  {
    id: "sample-1",
    title: "Secure water main valve",
    problem: "Water damage",
    assignee: "Jonas",
    location: "Florastraße 47, Pankow",
    deadline: "Before 12:00",
    status: "in_progress",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    title: "Repair bathroom leak",
    problem: "Ceiling leak from upstairs bathroom",
    assignee: "Marek",
    location: "Florastraße 47, 3rd floor",
    deadline: "14:00",
    itemToBuy: "15 mm copper pipe fitting",
    material: "15 mm copper pipe fitting",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-3",
    title: "Heating maintenance",
    problem: "Scheduled service",
    assignee: "Marek",
    location: "Friedrichshain",
    status: "pending",
    createdAt: new Date().toISOString(),
  },
];
