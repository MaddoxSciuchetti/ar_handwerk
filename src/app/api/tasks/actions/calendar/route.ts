import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createCalendarEventFromTask } from "@/lib/google/calendar";
import type { Task } from "@/lib/tasks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      task?: Task;
      summary?: string;
      location?: string;
      start?: string;
      end?: string;
      description?: string;
    };
    if (!body.task?.id || !body.task?.title) {
      return NextResponse.json({ error: "A valid task is required" }, { status: 400 });
    }

    const result = await createCalendarEventFromTask(user.id, body.task, {
      summary: body.summary,
      location: body.location,
      start: body.start,
      end: body.end,
      description: body.description,
    });
    return NextResponse.json({
      type: "calendar" as const,
      calendarEventId: result.eventId,
      calendarLink: result.htmlLink,
      calendarAccount: result.calendarAccount,
      calendarStart: result.start,
      calendarEnd: result.end,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
