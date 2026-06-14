import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type GoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  email?: string;
  connectedAt: string;
};

const STORE_DIR =
  process.env.GOOGLE_TOKEN_STORE_PATH ?? path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "google-tokens.enc");

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not configured");
  }
  return createHash("sha256").update(`${secret}:google-tokens`).digest();
}

function encryptPayload(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

function decryptPayload(payload: string): string {
  const key = getEncryptionKey();
  const buffer = Buffer.from(payload, "base64url");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function readStore(): Record<string, GoogleTokens> {
  try {
    if (!fs.existsSync(STORE_FILE)) return {};
    const payload = fs.readFileSync(STORE_FILE, "utf8");
    if (!payload.trim()) return {};
    return JSON.parse(decryptPayload(payload)) as Record<string, GoogleTokens>;
  } catch {
    return {};
  }
}

function writeStore(record: Record<string, GoogleTokens>): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  const payload = encryptPayload(JSON.stringify(record));
  fs.writeFileSync(STORE_FILE, payload, "utf8");
}

export function readGoogleTokenRecord(userId: string): GoogleTokens | null {
  const record = readStore();
  return record[userId] ?? null;
}

export function writeGoogleTokenRecord(userId: string, tokens: GoogleTokens): void {
  const record = readStore();
  record[userId] = tokens;
  writeStore(record);
}

export function deleteGoogleTokenRecord(userId: string): void {
  const record = readStore();
  if (!record[userId]) return;
  delete record[userId];
  writeStore(record);
}
