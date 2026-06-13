import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { isGoogleOAuthConfigured, getGoogleAuthUrl } from "@/lib/google/oauth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");
  const url = getGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
