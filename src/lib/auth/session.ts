import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

const SESSION_COOKIE = "field_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

function encodeSession(user: SessionUser): string {
  const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function decodeSession(token: string): SessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = signPayload(payload);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function setSessionUser(user: SessionUser): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export function validateDemoCredentials(email: string, password: string): SessionUser | null {
  const demoEmail = process.env.DEMO_USER_EMAIL;
  const demoPassword = process.env.DEMO_USER_PASSWORD;
  const demoName = process.env.DEMO_USER_NAME ?? "Demo User";

  if (!demoEmail || !demoPassword) return null;
  if (email !== demoEmail || password !== demoPassword) return null;

  return {
    id: "demo-user",
    email: demoEmail,
    name: demoName,
  };
}
