import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { deleteTaskForUser, updateTaskForUser } from "@/lib/tasks/repository";
import type { Task } from "@/lib/tasks";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as Partial<Task>;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }

    const task: Task = {
      id,
      title: body.title,
      problem: body.problem,
      assignee: body.assignee,
      location: body.location,
      deadline: body.deadline,
      itemToBuy: body.itemToBuy,
      material: body.material,
      equipment: body.equipment,
      status: body.status ?? "pending",
      proposedActions: body.proposedActions,
      actionFlowStep: body.actionFlowStep,
      integrations: body.integrations,
      pioneerExtraction: body.pioneerExtraction,
      createdAt: body.createdAt ?? new Date().toISOString(),
    };

    const updated = await updateTaskForUser(user.id, task);
    if (!updated) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("Failed to update task", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const deleted = await deleteTaskForUser(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete task", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
