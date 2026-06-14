import type { ProposedAction } from "@/lib/actions/types";
import { getDb } from "@/lib/db/client";
import type { Task, TaskIntegrations, TaskStatus, PioneerTaskExtraction } from "@/lib/tasks";

type TaskRow = {
  id: string;
  user_id: string;
  title: string;
  problem: string | null;
  assignee: string | null;
  location: string | null;
  deadline: string | null;
  item_to_buy: string | null;
  material: string | null;
  equipment: string | null;
  status: TaskStatus;
  proposed_actions: ProposedAction[] | string;
  action_flow_step: number;
  integrations: TaskIntegrations | string;
  source_transcript: string | null;
  pioneer_extraction: unknown | string | null;
  created_at: string;
  updated_at: string;
};

function parseJsonField<T>(value: T | string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value;
}

let tasksSchemaReady = false;

async function ensureTasksSchema(): Promise<void> {
  if (tasksSchemaReady) return;

  const sql = getDb();
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pioneer_extraction JSONB`;
  tasksSchemaReady = true;
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    problem: row.problem ?? undefined,
    assignee: row.assignee ?? undefined,
    location: row.location ?? undefined,
    deadline: row.deadline ?? undefined,
    itemToBuy: row.item_to_buy ?? undefined,
    material: row.material ?? undefined,
    equipment: row.equipment ?? undefined,
    status: row.status,
    proposedActions: parseJsonField(row.proposed_actions, []),
    actionFlowStep: row.action_flow_step,
    integrations: parseJsonField(row.integrations, {}),
    pioneerExtraction: parseJsonField<PioneerTaskExtraction | undefined>(
      row.pioneer_extraction as PioneerTaskExtraction | string | null | undefined,
      undefined,
    ),
    createdAt: row.created_at,
  };
}

export async function listTasksForUser(userId: string): Promise<Task[]> {
  await ensureTasksSchema();
  const sql = getDb();
  const rows = await sql`
    SELECT
      id, user_id, title, problem, assignee, location, deadline,
      item_to_buy, material, equipment, status, proposed_actions,
      action_flow_step, integrations, source_transcript, pioneer_extraction, created_at, updated_at
    FROM tasks
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return (rows as TaskRow[]).map(mapTask);
}

export type CreateTaskInput = Omit<Task, "id" | "createdAt"> & {
  sourceTranscript?: string;
};

export async function createTasksForUser(
  userId: string,
  inputs: CreateTaskInput[],
): Promise<Task[]> {
  if (inputs.length === 0) return [];

  await ensureTasksSchema();
  const sql = getDb();
  const created: Task[] = [];

  for (const input of inputs) {
    const rows = await sql`
      INSERT INTO tasks (
        user_id, title, problem, assignee, location, deadline,
        item_to_buy, material, equipment, status, proposed_actions,
        action_flow_step, integrations, source_transcript, pioneer_extraction, updated_at
      )
      VALUES (
        ${userId},
        ${input.title},
        ${input.problem ?? null},
        ${input.assignee ?? null},
        ${input.location ?? null},
        ${input.deadline ?? null},
        ${input.itemToBuy ?? null},
        ${input.material ?? null},
        ${input.equipment ?? null},
        ${input.status ?? "pending"},
        ${JSON.stringify(input.proposedActions ?? [])},
        ${input.actionFlowStep ?? 0},
        ${JSON.stringify(input.integrations ?? {})},
        ${input.sourceTranscript ?? null},
        ${input.pioneerExtraction ?? null},
        now()
      )
      RETURNING
        id, user_id, title, problem, assignee, location, deadline,
        item_to_buy, material, equipment, status, proposed_actions,
        action_flow_step, integrations, source_transcript, pioneer_extraction, created_at, updated_at
    `;

    created.push(mapTask(rows[0] as TaskRow));
  }

  return created;
}

export async function updateTaskForUser(userId: string, task: Task): Promise<Task | null> {
  await ensureTasksSchema();
  const sql = getDb();
  const existingRows = await sql`
    SELECT pioneer_extraction
    FROM tasks
    WHERE id = ${task.id} AND user_id = ${userId}
    LIMIT 1
  `;
  const existingExtraction = (existingRows[0] as { pioneer_extraction?: unknown } | undefined)
    ?.pioneer_extraction;
  const pioneerExtraction =
    task.pioneerExtraction ??
    (existingExtraction
      ? parseJsonField<PioneerTaskExtraction | undefined>(
          existingExtraction as PioneerTaskExtraction | string | null | undefined,
          undefined,
        )
      : undefined);

  const rows = await sql`
    UPDATE tasks
    SET
      title = ${task.title},
      problem = ${task.problem ?? null},
      assignee = ${task.assignee ?? null},
      location = ${task.location ?? null},
      deadline = ${task.deadline ?? null},
      item_to_buy = ${task.itemToBuy ?? null},
      material = ${task.material ?? null},
      equipment = ${task.equipment ?? null},
      status = ${task.status},
      proposed_actions = ${JSON.stringify(task.proposedActions ?? [])},
      action_flow_step = ${task.actionFlowStep ?? 0},
      integrations = ${JSON.stringify(task.integrations ?? {})},
      pioneer_extraction = ${pioneerExtraction ?? null},
      updated_at = now()
    WHERE id = ${task.id} AND user_id = ${userId}
    RETURNING
      id, user_id, title, problem, assignee, location, deadline,
      item_to_buy, material, equipment, status, proposed_actions,
      action_flow_step, integrations, source_transcript, pioneer_extraction, created_at, updated_at
  `;

  const row = rows[0] as TaskRow | undefined;
  return row ? mapTask(row) : null;
}

export async function deleteTaskForUser(userId: string, taskId: string): Promise<boolean> {
  const sql = getDb();
  const rows = await sql`
    DELETE FROM tasks
    WHERE id = ${taskId} AND user_id = ${userId}
    RETURNING id
  `;

  return rows.length > 0;
}
