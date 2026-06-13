import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  createTasksForUser,
  listTasksForUser,
  type CreateTaskInput,
} from "@/lib/tasks/repository";
import type { Task } from "@/lib/tasks";

export const runtime = "nodejs";

function isTaskStatus(value: string): value is Task["status"] {
  return value === "pending" || value === "in_progress" || value === "done";
}

function toCreateInput(task: Task, sourceTranscript?: string): CreateTaskInput {
  return {
    title: task.title,
    problem: task.problem,
    assignee: task.assignee,
    location: task.location,
    deadline: task.deadline,
    itemToBuy: task.itemToBuy,
    material: task.material,
    equipment: task.equipment,
    status: isTaskStatus(task.status) ? task.status : "pending",
    proposedActions: task.proposedActions,
    actionFlowStep: task.actionFlowStep,
    integrations: task.integrations,
    sourceTranscript,
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tasks = await listTasksForUser(user.id);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to load tasks", error);
    return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      tasks?: Task[];
      sourceTranscript?: string;
    };

    if (!Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json({ error: "A non-empty tasks array is required" }, { status: 400 });
    }

    const inputs = body.tasks.map((task) =>
      toCreateInput(task, body.sourceTranscript),
    );
    const tasks = await createTasksForUser(user.id, inputs);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to create tasks", error);
    return NextResponse.json({ error: "Failed to create tasks" }, { status: 500 });
  }
}
