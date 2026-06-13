import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google/oauth";
import { getGoogleTokens, setGoogleTokens } from "@/lib/google/tokens";

export async function getGoogleAuthClient(userId: string) {
  const tokens = getGoogleTokens(userId);
  if (!tokens) {
    throw new Error("Google account is not connected");
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiryDate,
  });

  client.on("tokens", (newTokens) => {
    setGoogleTokens(userId, {
      ...tokens,
      accessToken: newTokens.access_token ?? tokens.accessToken,
      refreshToken: newTokens.refresh_token ?? tokens.refreshToken,
      expiryDate: newTokens.expiry_date ?? tokens.expiryDate,
    });
  });

  return client;
}

export async function getGmailClient(userId: string) {
  const auth = await getGoogleAuthClient(userId);
  return google.gmail({ version: "v1", auth });
}

export async function getCalendarClient(userId: string) {
  const auth = await getGoogleAuthClient(userId);
  return google.calendar({ version: "v3", auth });
}
