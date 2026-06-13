import type { Task } from "@/lib/tasks";
import { getGmailClient } from "@/lib/google/client";
import { getGoogleTokens } from "@/lib/google/tokens";
import { sendMailboxEmail } from "@/lib/gmail/mailbox";

export type EmailDraft = {
  to: string;
  subject: string;
  body: string;
};

function buildTaskEmailBody(task: Task): string {
  const lines = [
    `Task: ${task.title}`,
    task.problem ? `Problem: ${task.problem}` : null,
    task.assignee ? `Assignee: ${task.assignee}` : null,
    task.location ? `Location: ${task.location}` : null,
    task.deadline ? `Deadline: ${task.deadline}` : null,
    "",
    "Created from Field Tasks demo.",
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

export async function sendTaskEmail(
  userId: string,
  task: Task,
  overrides?: Partial<EmailDraft> & { toEmail?: string },
) {
  const tokens = getGoogleTokens(userId);
  const recipient = overrides?.to?.trim() || overrides?.toEmail?.trim() || tokens?.email;
  if (!recipient) {
    throw new Error("No recipient email available. Connect Google or provide an address.");
  }

  const subject = overrides?.subject?.trim() || `Field task: ${task.title}`;
  const body = overrides?.body?.trim() || buildTaskEmailBody(task);

  const result = await sendMailboxEmail(userId, {
    to: recipient,
    subject,
    body,
  });

  return {
    messageId: result.messageId,
    threadId: result.threadId,
    to: recipient,
    subject,
  };
}

export async function getConnectedGmailAddress(userId: string) {
  const tokens = getGoogleTokens(userId);
  if (tokens?.email) return tokens.email;

  const gmail = await getGmailClient(userId);
  const profile = await gmail.users.getProfile({ userId: "me" });
  return profile.data.emailAddress ?? null;
}
