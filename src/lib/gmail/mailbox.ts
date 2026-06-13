import type { gmail_v1 } from "googleapis";
import type {
  GmailListItem,
  GmailMailbox,
  GmailMessageDetail,
  SendEmailInput,
} from "@/lib/gmail/types";
import { getGmailClient } from "@/lib/google/client";

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  const header = headers?.find((item) => item.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  const parts = payload.parts ?? [];
  const plain = parts.find((part) => part.mimeType === "text/plain");
  if (plain?.body?.data) {
    return decodeBase64Url(plain.body.data);
  }

  const html = parts.find((part) => part.mimeType === "text/html");
  if (html?.body?.data) {
    return decodeBase64Url(html.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  for (const part of parts) {
    const nested = extractBody(part);
    if (nested) return nested;
  }

  return "";
}

function toListItem(message: gmail_v1.Schema$Message): GmailListItem {
  const headers = message.payload?.headers;
  const dateHeader = getHeader(headers, "Date");
  const parsedDate = dateHeader ? new Date(dateHeader) : new Date(Number(message.internalDate));

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    from: getHeader(headers, "From"),
    to: getHeader(headers, "To"),
    subject: getHeader(headers, "Subject") || "(No subject)",
    snippet: message.snippet ?? "",
    date: Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
    isUnread: message.labelIds?.includes("UNREAD") ?? false,
  };
}

function toMessageDetail(message: gmail_v1.Schema$Message): GmailMessageDetail {
  const headers = message.payload?.headers;
  const listItem = toListItem(message);

  return {
    ...listItem,
    cc: getHeader(headers, "Cc") || undefined,
    replyTo: getHeader(headers, "Reply-To") || undefined,
    body: extractBody(message.payload),
  };
}

function encodeEmail(raw: string): string {
  return Buffer.from(raw).toString("base64url");
}

function formatAddressList(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function buildRawEmail(input: SendEmailInput): string {
  const lines = [
    input.to ? `To: ${input.to}` : null,
    formatAddressList(input.cc) ? `Cc: ${input.cc}` : null,
    formatAddressList(input.bcc) ? `Bcc: ${input.bcc}` : null,
    `Subject: ${input.subject}`,
    input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : null,
    input.references ? `References: ${input.references}` : null,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    input.body,
  ].filter((line): line is string => line !== null);

  return lines.join("\r\n");
}

export async function listMailboxMessages(
  userId: string,
  mailbox: GmailMailbox = "INBOX",
  options?: { pageToken?: string; maxResults?: number },
) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.list({
    userId: "me",
    labelIds: [mailbox],
    maxResults: options?.maxResults ?? 25,
    pageToken: options?.pageToken,
  });

  const summaries = await Promise.all(
    (response.data.messages ?? []).map(async (item) => {
      if (!item.id) return null;
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: item.id,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
      return toListItem(detail.data);
    }),
  );

  return {
    messages: summaries.filter((item): item is GmailListItem => item !== null),
    nextPageToken: response.data.nextPageToken ?? null,
  };
}

export async function getMailboxMessage(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return toMessageDetail(response.data);
}

export async function sendMailboxEmail(userId: string, input: SendEmailInput) {
  const gmail = await getGmailClient(userId);
  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodeEmail(buildRawEmail(input)),
      threadId: input.threadId,
    },
  });

  return {
    messageId: response.data.id ?? "",
    threadId: response.data.threadId ?? null,
  };
}

export async function markMailboxMessageRead(userId: string, messageId: string, read: boolean) {
  const gmail = await getGmailClient(userId);
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: read
      ? { removeLabelIds: ["UNREAD"] }
      : { addLabelIds: ["UNREAD"] },
  });
}

export async function trashMailboxMessage(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);
  await gmail.users.messages.trash({
    userId: "me",
    id: messageId,
  });
}
