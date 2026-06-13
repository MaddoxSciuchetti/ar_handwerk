import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { sendMailboxEmail } from "@/lib/gmail/mailbox";
import type { SendEmailInput } from "@/lib/gmail/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<SendEmailInput>;
    const to = body.to?.trim();
    const subject = body.subject?.trim();
    const emailBody = body.body?.trim();

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "To, subject, and body are required" },
        { status: 400 },
      );
    }

    const result = await sendMailboxEmail(user.id, {
      to,
      cc: body.cc?.trim() || undefined,
      bcc: body.bcc?.trim() || undefined,
      subject,
      body: emailBody,
      threadId: body.threadId,
      inReplyTo: body.inReplyTo,
      references: body.references,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
