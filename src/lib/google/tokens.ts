import type { SessionUser } from "@/lib/auth/session";

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  email?: string;
  connectedAt: string;
};

/**
 * In-memory token store for demo use. Replace with a database for production.
 */
const tokenStore = new Map<string, GoogleTokens>();

export function getGoogleTokens(userId: string): GoogleTokens | null {
  return tokenStore.get(userId) ?? null;
}

export function setGoogleTokens(userId: string, tokens: GoogleTokens): void {
  tokenStore.set(userId, tokens);
}

export function clearGoogleTokens(userId: string): void {
  tokenStore.delete(userId);
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
