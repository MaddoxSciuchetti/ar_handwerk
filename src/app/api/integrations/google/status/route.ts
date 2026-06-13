import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { clearGoogleTokens, getGoogleConnectionStatus } from "@/lib/google/tokens";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ...getGoogleConnectionStatus(user),
    configured: isGoogleOAuthConfigured(),
  });
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  clearGoogleTokens(user.id);
  return NextResponse.json({ ok: true });
}
