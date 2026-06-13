export type GmailMailbox = "INBOX" | "SENT" | "DRAFT" | "TRASH" | "STARRED";

export type GmailListItem = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
};

export type GmailMessageDetail = GmailListItem & {
  cc?: string;
  replyTo?: string;
  body: string;
};

export type SendEmailInput = {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
};

export type ComposeDraft = {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  threadId?: string;
  inReplyTo?: string;
  references?: string;
};
