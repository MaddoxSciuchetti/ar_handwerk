import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { sendTaskEmail } from "@/lib/google/gmail";
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
      toEmail?: string;
      to?: string;
      subject?: string;
      body?: string;
    };
    if (!body.task?.id || !body.task?.title) {
      return NextResponse.json({ error: "A valid task is required" }, { status: 400 });
    }

    const result = await sendTaskEmail(user.id, body.task, {
      toEmail: body.toEmail,
      to: body.to,
      subject: body.subject,
      body: body.body,
    });
    return NextResponse.json({
      type: "gmail" as const,
      gmailMessageId: result.messageId,
      gmailThreadId: result.threadId,
      to: result.to,
      subject: result.subject,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
