import type { ProposedAction } from "@/lib/actions/types";
import {
  consolidatePurchaseFields,
  getTaskDisplayAttributes,
  isLowQualityTaskTitle,
  normalizeEntityText,
  normalizeTaskTitle,
} from "@/lib/task-normalize";

export type { TaskDisplayAttribute } from "@/lib/task-normalize";
export { getTaskDisplayAttributes };

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

export type Task = {
  id: string;
  title: string;
  problem?: string;
  assignee?: string;
  location?: string;
  deadline?: string;
  itemToBuy?: string;
  material?: string;
  equipment?: string;
  status: TaskStatus;
  createdAt: string;
  integrations?: TaskIntegrations;
  proposedActions?: ProposedAction[];
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
  proposed_action?: PioneerEntitySpan[];
  people?: PioneerEntitySpan[];
  location?: PioneerEntitySpan[];
  deadline?: PioneerEntitySpan[];
};

type PioneerData = {
  service_task?: PioneerServiceTask[];
  entities?: PioneerEntities;
};

function normalizePioneerPayload(data: unknown): PioneerData {
  if (typeof data === "string") {
    try {
      return normalizePioneerPayload(JSON.parse(data));
    } catch {
      return {};
    }
  }

  if (!data || typeof data !== "object") return {};

  const record = data as Record<string, unknown>;

  if (
    "data" in record &&
    record.data &&
    typeof record.data === "object" &&
    !("service_task" in record) &&
    !("entities" in record)
  ) {
    return normalizePioneerPayload(record.data);
  }

  let serviceTask = record.service_task;
  if (serviceTask && !Array.isArray(serviceTask)) {
    serviceTask = [serviceTask];
  }

  return {
    service_task: serviceTask as PioneerServiceTask[] | undefined,
    entities: record.entities as PioneerEntities | undefined,
  };
}

export function hasPioneerTaskSignals(data: unknown): boolean {
  const parsed = normalizePioneerPayload(data);
  if (Array.isArray(parsed.service_task) && parsed.service_task.length > 0) {
    return true;
  }

  const entities = parsed.entities;
  if (!entities) return false;

  return Boolean(
    entities.task?.some((span) => span.text?.trim()) ||
      entities.proposed_action?.some((span) => span.text?.trim()),
  );
}

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

function parseServiceTaskRows(items: PioneerServiceTask[]): Task[] {
  const batchId = Date.now();

  return items.flatMap((item, index) => {
    const rawTitle = fieldText(item.task) ?? fieldText(item.proposed_action);
    if (!rawTitle?.trim()) return [];

    const proposedAction = fieldText(item.proposed_action);
    const purchase = consolidatePurchaseFields(
      fieldText(item.material),
      fieldText(item.equipment),
    );

    return [
      {
        id: `pioneer-${batchId}-${index}`,
        title: normalizeTaskTitle(rawTitle, proposedAction),
        problem: normalizeEntityText(fieldText(item.problem)),
        assignee: normalizeEntityText(fieldText(item.people)),
        location: normalizeEntityText(fieldText(item.location)),
        deadline: normalizeEntityText(fieldText(item.deadline)),
        ...purchase,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
      },
    ];
  });
}

/** Fallback when Pioneer returns entities but no grouped service_task rows. */
function parseEntityFallback(entities: PioneerEntities | undefined): Task[] {
  const batchId = Date.now();
  const taskSpans = (entities?.task ?? []).filter((span) => span.text?.trim());
  const actionSpans = (entities?.proposed_action ?? []).filter((span) => span.text?.trim());
  const anchors = taskSpans.length > 0 ? taskSpans : actionSpans;
  if (anchors.length === 0) return [];

  return anchors.map((taskSpan, index) => ({
    id: `pioneer-entity-${batchId}-${index}`,
    title: normalizeTaskTitle(taskSpan.text!.trim()),
    problem: normalizeEntityText(nearestEntityText(taskSpan, entities?.problem)),
    assignee: normalizeEntityText(nearestEntityText(taskSpan, entities?.people)),
    location: normalizeEntityText(nearestEntityText(taskSpan, entities?.location)),
    deadline: normalizeEntityText(nearestEntityText(taskSpan, entities?.deadline)),
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  }));
}

export function parsePioneerTasks(data: unknown): Task[] {
  const parsed = normalizePioneerPayload(data);
  const fromStructures = parseServiceTaskRows(parsed.service_task ?? []);
  const tasks =
    fromStructures.length > 0 ? fromStructures : parseEntityFallback(parsed.entities);
  return tasks.filter((task) => !isLowQualityTaskTitle(task.title));
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
