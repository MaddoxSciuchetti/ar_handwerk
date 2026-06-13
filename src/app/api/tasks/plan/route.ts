import { NextResponse } from "next/server";
import { planActionsForTasks } from "@/lib/actions/planner";
import { getSessionUser } from "@/lib/auth/session";
import { getConnectedGmailAddress } from "@/lib/google/gmail";
import type { Task } from "@/lib/tasks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { tasks?: Task[]; transcript?: string };
    const tasks = body.tasks;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ error: "A non-empty tasks array is required" }, { status: 400 });
    }

    const defaultEmail = await getConnectedGmailAddress(user.id).catch(() => null);

    const planned = await planActionsForTasks(tasks, {
      transcript: typeof body.transcript === "string" ? body.transcript : undefined,
      defaultEmail,
    });

    return NextResponse.json({ tasks: planned });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
