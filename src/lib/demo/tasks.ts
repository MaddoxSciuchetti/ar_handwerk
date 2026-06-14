import type { Task } from "@/lib/tasks";
import { isDemoScriptId } from "@/lib/demo/transcripts";
import { enrichTasksWithPioneerData, parsePioneerTasks } from "@/lib/tasks";

export type DemoTaskTopic = {
  title: string;
  problem?: string;
  location?: string;
  assignee?: string;
  deadline?: string;
  itemToBuy?: string;
  material?: string;
};

/** Canonical topic per demo video — one task card per video after Pioneer runs. */
export const DEMO_TASK_TOPICS: Record<string, DemoTaskTopic> = {
  "legionellen-pruefung": {
    title: "Legionellenprüfung Grundschule Weißenburger Straße",
    problem:
      "Legionellenprüfung an Trinkwasserleitungen abgeschlossen — Rechnung, Nachkontrolle und Flexschläuche offen",
    location: "Grundschule Weißenburger Straße",
    itemToBuy: "3 Flexschläuche (REISSER)",
    material: "Flexschläuche für Waschtische",
    deadline: "Kontrolltermin in vier Wochen",
  },
  "leitungsrohrbruch": {
    title: "Neues Leitungssystem in der Schule verlegen",
    problem: "Leitungsrohrbruch im Keller — komplette Neuverlegung der Kellerleitung erforderlich",
    location: "Grundschule Weißenburger Straße",
    itemToBuy: "Kupferrohr, Pressfittinge, Dichtungen",
    material: "Rohrmaterial für Neuverlegung",
    deadline: "Donnerstag 08:00",
    assignee: "Frau Schneider (Schulleitung)",
  },
};

function pickFirstDefined<T>(values: (T | undefined)[]): T | undefined {
  for (const value of values) {
    if (value?.toString().trim()) return value;
  }
  return undefined;
}

/**
 * Pioneer often returns multiple rows for one demo transcript. Collapse them into
 * a single topic task so FAL plans sub-actions underneath it.
 */
export function consolidateDemoTopicTasks(
  scriptId: string,
  pioneerData: unknown,
  parsedTasks: Task[],
): Task[] {
  const topic = DEMO_TASK_TOPICS[scriptId];
  if (!topic) return parsedTasks;

  const batchId = Date.now();
  const primary = parsedTasks[0];

  const merged: Task = {
    id: `demo-${scriptId}-${batchId}`,
    title: topic.title,
    problem: pickFirstDefined([topic.problem, ...parsedTasks.map((t) => t.problem)]),
    location: pickFirstDefined([topic.location, ...parsedTasks.map((t) => t.location)]),
    assignee: pickFirstDefined([topic.assignee, ...parsedTasks.map((t) => t.assignee)]),
    deadline: pickFirstDefined([topic.deadline, ...parsedTasks.map((t) => t.deadline)]),
    itemToBuy: pickFirstDefined([topic.itemToBuy, ...parsedTasks.map((t) => t.itemToBuy)]),
    material: pickFirstDefined([topic.material, ...parsedTasks.map((t) => t.material)]),
    equipment: pickFirstDefined(parsedTasks.map((t) => t.equipment)),
    status: "pending",
    createdAt: new Date().toISOString(),
    pioneerExtraction: primary?.pioneerExtraction,
  };

  return enrichTasksWithPioneerData(pioneerData, [merged]);
}

export function parseDemoTopicTasks(
  scriptId: string,
  pioneerData: unknown,
): Task[] {
  if (!isDemoScriptId(scriptId)) {
    throw new Error(`Unknown demo script "${scriptId}".`);
  }
  return consolidateDemoTopicTasks(scriptId, pioneerData, parsePioneerTasks(pioneerData));
}

export function getDemoTopicTitle(scriptId: string): string | undefined {
  return DEMO_TASK_TOPICS[scriptId]?.title;
}
