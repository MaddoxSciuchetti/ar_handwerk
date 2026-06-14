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
  calendarAccount?: string | null;
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
  pioneerExtraction?: PioneerTaskExtraction;
};

export type PioneerEntitySpan = { text?: string; confidence?: number; start?: number; end?: number };

export type PioneerEntities = Record<string, PioneerEntitySpan[] | undefined>;

export type PioneerData = {
  service_task?: PioneerServiceTask[];
  entities?: PioneerEntities;
  relations?: unknown;
};

export type PioneerTaskExtraction = {
  /** Full Pioneer payload for this analyze batch. */
  raw: PioneerData;
  matched_service_task?: PioneerServiceTask;
  matched_task_span?: PioneerEntitySpan;
  matched_entities?: Record<string, PioneerEntitySpan | undefined>;
  task_index?: number;
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

export type PioneerServiceTask = {
  task?: EntityField;
  problem?: EntityField;
  proposed_action?: EntityField;
  material?: EntityField;
  equipment?: EntityField;
  people?: EntityField;
  location?: EntityField;
  deadline?: EntityField;
  decision?: EntityField;
  cost?: EntityField;
  difficulty?: EntityField;
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
    relations: record.relations,
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

function buildMatchedEntities(
  taskSpan: PioneerEntitySpan,
  entities: PioneerEntities | undefined,
): Record<string, PioneerEntitySpan | undefined> {
  if (!entities) return {};

  return Object.fromEntries(
    Object.entries(entities).map(([key, spans]) => [
      key,
      nearestEntitySpan(taskSpan, spans),
    ]),
  );
}

function buildPioneerExtraction(
  parsed: PioneerData,
  match?: {
    serviceTask?: PioneerServiceTask;
    taskSpan?: PioneerEntitySpan;
    index?: number;
  },
): PioneerTaskExtraction {
  return {
    raw: parsed,
    ...(match?.serviceTask ? { matched_service_task: match.serviceTask } : {}),
    ...(match?.taskSpan
      ? {
          matched_task_span: match.taskSpan,
          matched_entities: buildMatchedEntities(match.taskSpan, parsed.entities),
        }
      : {}),
    ...(match?.index != null ? { task_index: match.index } : {}),
  };
}

function parseServiceTaskRows(items: PioneerServiceTask[], parsed: PioneerData): Task[] {
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
        pioneerExtraction: buildPioneerExtraction(parsed, { serviceTask: item, index }),
      },
    ];
  });
}

/** Fallback when Pioneer returns entities but no grouped service_task rows. */
function parseEntityFallback(entities: PioneerEntities | undefined, parsed: PioneerData): Task[] {
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
    pioneerExtraction: buildPioneerExtraction(parsed, { taskSpan, index }),
  }));
}

/** Re-attach full Pioneer payload if planning or persistence dropped it. */
export function enrichTasksWithPioneerData(data: unknown, tasks: Task[]): Task[] {
  const parsed = normalizePioneerPayload(data);
  if (!parsed.entities && !parsed.service_task && !parsed.relations) {
    return tasks;
  }

  const structured = parsed.service_task ?? [];
  const entityAnchors = (parsed.entities?.task ?? []).filter((span) => span.text?.trim());
  const actionAnchors = (parsed.entities?.proposed_action ?? []).filter((span) => span.text?.trim());
  const fallbackAnchors = entityAnchors.length > 0 ? entityAnchors : actionAnchors;

  return tasks.map((task, index) => {
    if (task.pioneerExtraction?.raw) return task;

    const serviceTask = structured[index];
    const taskSpan = fallbackAnchors[index];

    if (!serviceTask && !taskSpan) {
      return {
        ...task,
        pioneerExtraction: buildPioneerExtraction(parsed, { index }),
      };
    }

    return {
      ...task,
      pioneerExtraction: buildPioneerExtraction(parsed, {
        serviceTask,
        taskSpan,
        index,
      }),
    };
  });
}

export function formatPioneerExtractionJson(task: Task): string {
  if (task.pioneerExtraction) {
    return JSON.stringify(task.pioneerExtraction, null, 2);
  }

  return JSON.stringify(
    {
      source: "derived_from_task",
      note: "Raw Pioneer extraction was not stored for this task. Showing parsed task fields.",
      task: {
        title: task.title,
        problem: task.problem ?? null,
        assignee: task.assignee ?? null,
        location: task.location ?? null,
        deadline: task.deadline ?? null,
        itemToBuy: task.itemToBuy ?? null,
        material: task.material ?? null,
        equipment: task.equipment ?? null,
      },
    },
    null,
    2,
  );
}

export function parsePioneerTasks(data: unknown): Task[] {
  const parsed = normalizePioneerPayload(data);
  const fromStructures = parseServiceTaskRows(parsed.service_task ?? [], parsed);
  const tasks =
    fromStructures.length > 0
      ? fromStructures
      : parseEntityFallback(parsed.entities, parsed);
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
