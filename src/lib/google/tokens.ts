import type { SessionUser } from "@/lib/auth/session";
import {
  deleteGoogleTokenRecord,
  readGoogleTokenRecord,
  writeGoogleTokenRecord,
  type GoogleTokens,
} from "@/lib/google/token-store";

export type { GoogleTokens };

export function getGoogleTokens(userId: string): GoogleTokens | null {
  return readGoogleTokenRecord(userId);
}

export function setGoogleTokens(userId: string, tokens: GoogleTokens): void {
  writeGoogleTokenRecord(userId, tokens);
}

export function clearGoogleTokens(userId: string): void {
  deleteGoogleTokenRecord(userId);
}

export function getGoogleConnectionStatus(user: SessionUser) {
  const tokens = getGoogleTokens(user.id);
  return {
    connected: Boolean(tokens?.refreshToken || tokens?.accessToken),
    email: tokens?.email ?? null,
    connectedAt: tokens?.connectedAt ?? null,
    scopes: ["calendar.events", "gmail.send", "gmail.readonly", "gmail.modify"],
  };
}
