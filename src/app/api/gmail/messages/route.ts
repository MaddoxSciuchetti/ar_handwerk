import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { listMailboxMessages } from "@/lib/gmail/mailbox";
import type { GmailMailbox } from "@/lib/gmail/types";

export const runtime = "nodejs";

const MAILBOXES = new Set<GmailMailbox>(["INBOX", "SENT", "DRAFT", "TRASH", "STARRED"]);

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const mailbox = (searchParams.get("mailbox") ?? "INBOX") as GmailMailbox;
    const pageToken = searchParams.get("pageToken") ?? undefined;

    if (!MAILBOXES.has(mailbox)) {
      return NextResponse.json({ error: "Invalid mailbox" }, { status: 400 });
    }

    const result = await listMailboxMessages(user.id, mailbox, { pageToken });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
