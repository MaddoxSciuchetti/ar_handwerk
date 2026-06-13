import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google/oauth";
import { setGoogleTokens } from "@/lib/google/tokens";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const settingsUrl = `${appUrl}?tab=settings&settings=integrations`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}&google_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${settingsUrl}&google_error=missing_code`);
  }

  try {
    const { userId } = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      userId: string;
    };

    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();

    setGoogleTokens(userId, {
      accessToken: tokens.access_token ?? "",
      refreshToken: tokens.refresh_token ?? undefined,
      expiryDate: tokens.expiry_date ?? undefined,
      email: profile.data.email ?? undefined,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(`${settingsUrl}&google_connected=1`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_failed";
    return NextResponse.redirect(`${settingsUrl}&google_error=${encodeURIComponent(message)}`);
  }
}
