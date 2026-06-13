import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getMailboxMessage, markMailboxMessageRead, trashMailboxMessage } from "@/lib/gmail/mailbox";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const message = await getMailboxMessage(user.id, id);
    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as { read?: boolean; trash?: boolean };

    if (body.trash) {
      await trashMailboxMessage(user.id, id);
      return NextResponse.json({ ok: true, trashed: true });
    }

    if (typeof body.read === "boolean") {
      await markMailboxMessageRead(user.id, id, body.read);
      return NextResponse.json({ ok: true, read: body.read });
    }

    return NextResponse.json({ error: "No supported action provided" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
