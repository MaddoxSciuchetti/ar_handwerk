"use client";

import { useCallback, useEffect, useState } from "react";
import { CenteredPageContent } from "@/components/centered-page-content";
import type {
  ComposeDraft,
  GmailListItem,
  GmailMailbox,
  GmailMessageDetail,
} from "@/lib/gmail/types";

type GmailViewProps = {
  googleConnected: boolean;
};

type ViewMode = "list" | "read" | "compose";

const MAILBOXES: { id: GmailMailbox; label: string }[] = [
  { id: "INBOX", label: "Inbox" },
  { id: "SENT", label: "Sent" },
  { id: "DRAFT", label: "Drafts" },
  { id: "STARRED", label: "Starred" },
  { id: "TRASH", label: "Trash" },
];

const EMPTY_COMPOSE: ComposeDraft = {
  to: "",
  cc: "",
  subject: "",
  body: "",
};

export function GmailView({ googleConnected }: GmailViewProps) {
  const [mailbox, setMailbox] = useState<GmailMailbox>("INBOX");
  const [messages, setMessages] = useState<GmailListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageDetail | null>(null);
  const [compose, setCompose] = useState<ComposeDraft>(EMPTY_COMPOSE);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [mode, setMode] = useState<ViewMode>("list");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadMessages = useCallback(async (targetMailbox: GmailMailbox) => {
    setLoadingList(true);
    setError(null);
    try {
      const response = await fetch(`/api/gmail/messages?mailbox=${targetMailbox}`);
      const data = (await response.json()) as {
        messages?: GmailListItem[];
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not load messages");
        setMessages([]);
        return;
      }
      setMessages(data.messages ?? []);
    } catch {
      setError("Could not reach the server");
      setMessages([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (googleConnected) {
      void loadMessages(mailbox);
    }
  }, [googleConnected, mailbox, loadMessages]);

  async function openMessage(messageId: string) {
    setSelectedId(messageId);
    setMode("read");
    setLoadingMessage(true);
    setError(null);
    try {
      const response = await fetch(`/api/gmail/messages/${messageId}`);
      const data = (await response.json()) as {
        message?: GmailMessageDetail;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not load message");
        return;
      }
      setSelectedMessage(data.message ?? null);

      if (data.message?.isUnread) {
        await fetch(`/api/gmail/messages/${messageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        setMessages((prev) =>
          prev.map((item) => (item.id === messageId ? { ...item, isUnread: false } : item)),
        );
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoadingMessage(false);
    }
  }

  function startCompose(draft: ComposeDraft = EMPTY_COMPOSE) {
    setCompose({
      to: draft.to ?? "",
      cc: draft.cc ?? "",
      subject: draft.subject ?? "",
      body: draft.body ?? "",
      threadId: draft.threadId,
      inReplyTo: draft.inReplyTo,
      references: draft.references,
    });
    setShowCc(Boolean(draft.cc));
    setShowBcc(false);
    setMode("compose");
    setSelectedId(null);
    setSelectedMessage(null);
    setBanner(null);
  }

  function replyToMessage(message: GmailMessageDetail) {
    const sender = extractEmailAddress(message.replyTo || message.from);
    const subject = message.subject.startsWith("Re:")
      ? message.subject
      : `Re: ${message.subject}`;
    const quoted = `\n\n---\nOn ${formatDate(message.date)}, ${message.from} wrote:\n${message.body}`;

    startCompose({
      to: sender,
      subject,
      body: quoted,
      threadId: message.threadId,
      inReplyTo: message.id,
      references: message.id,
    });
  }

  async function sendEmail() {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: compose.to,
          cc: compose.cc || undefined,
          bcc: compose.bcc || undefined,
          subject: compose.subject,
          body: compose.body,
          threadId: compose.threadId,
          inReplyTo: compose.inReplyTo,
          references: compose.references,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not send email");
        return;
      }

      setBanner("Email sent successfully.");
      setMode("list");
      setCompose(EMPTY_COMPOSE);
      await loadMessages(mailbox);
    } catch {
      setError("Could not reach the server");
    } finally {
      setSending(false);
    }
  }

  async function trashSelectedMessage() {
    if (!selectedMessage) return;
    try {
      await fetch(`/api/gmail/messages/${selectedMessage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trash: true }),
      });
      setBanner("Message moved to trash.");
      setMode("list");
      setSelectedMessage(null);
      setSelectedId(null);
      await loadMessages(mailbox);
    } catch {
      setError("Could not delete message");
    }
  }

  if (!googleConnected) {
    return (
      <CenteredPageContent>
        <h1 className="page-title-hero">Mail</h1>
        <div className="widget-card flex h-[28rem] flex-col items-start justify-start gap-2">
          <p className="text-[12px] font-medium text-zinc-700">Connect Google to use Mail</p>
          <p className="body-sm text-zinc-500">
            Go to Workspace and connect your Google account. You will need to reconnect if you
            connected before inbox access was added.
          </p>
          <a
            href="/?tab=workspace"
            className="btn-primary focus-ring inline-flex self-start"
          >
            Open Workspace
          </a>
        </div>
      </CenteredPageContent>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="page-title-hero">Mail</h1>
        </div>
        <button
          type="button"
          onClick={() => startCompose()}
          className="btn-primary focus-ring"
        >
          Compose
        </button>
      </div>

      {banner ? <p className="callout callout-neutral">{banner}</p> : null}

      {error ? <p className="callout callout-error">{error}</p> : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-32 shrink-0 flex-col border-r border-zinc-100 p-1">
          {MAILBOXES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMailbox(item.id);
                setMode("list");
                setSelectedId(null);
                setSelectedMessage(null);
              }}
              className="nav-item focus-ring w-full px-2 py-1 text-left"
              data-active={mailbox === item.id ? "true" : undefined}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <section className="flex w-72 shrink-0 flex-col border-r border-zinc-100">
          <div className="border-b border-zinc-100 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              {MAILBOXES.find((item) => item.id === mailbox)?.label}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <p className="px-3 py-5 body-sm text-zinc-400">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="px-3 py-5 body-sm text-zinc-400">No messages in this folder.</p>
            ) : (
              messages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => void openMessage(message.id)}
                  className={`focus-ring w-full border-b border-zinc-50 px-3 py-2 text-left transition-colors ${
                    selectedId === message.id ? "bg-black/[0.03]" : "hover:bg-black/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate body-sm ${
                        message.isUnread ? "font-semibold text-zinc-900" : "font-medium text-zinc-700"
                      }`}
                    >
                      {formatSender(message.from)}
                    </p>
                    <span className="shrink-0 text-[11px] text-zinc-400">
                      {formatShortDate(message.date)}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 truncate body-sm ${
                      message.isUnread ? "font-medium text-zinc-800" : "text-zinc-600"
                    }`}
                  >
                    {message.subject}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-400">
                    {message.snippet}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="flex min-w-0 flex-1 flex-col">
          {mode === "compose" ? (
            <ComposePanel
              compose={compose}
              showCc={showCc}
              showBcc={showBcc}
              sending={sending}
              onChange={setCompose}
              onToggleCc={() => setShowCc((value) => !value)}
              onToggleBcc={() => setShowBcc((value) => !value)}
              onCancel={() => setMode("list")}
              onSend={() => void sendEmail()}
            />
          ) : mode === "read" && selectedMessage ? (
            <ReadPanel
              message={selectedMessage}
              loading={loadingMessage}
              onReply={() => replyToMessage(selectedMessage)}
              onTrash={() => void trashSelectedMessage()}
              onBack={() => setMode("list")}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <p className="max-w-sm body-sm text-zinc-400">
                Select a message to read it, or click Compose to send a new email.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ComposePanel({
  compose,
  showCc,
  showBcc,
  sending,
  onChange,
  onToggleCc,
  onToggleBcc,
  onCancel,
  onSend,
}: {
  compose: ComposeDraft;
  showCc: boolean;
  showBcc: boolean;
  sending: boolean;
  onChange: (value: ComposeDraft) => void;
  onToggleCc: () => void;
  onToggleBcc: () => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <p className="text-[12px] font-semibold text-zinc-900">New message</p>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onToggleCc} className="btn-text">
            {showCc ? "Hide Cc" : "Cc"}
          </button>
          <button type="button" onClick={onToggleBcc} className="btn-text">
            {showBcc ? "Hide Bcc" : "Bcc"}
          </button>
        </div>
      </div>

      <div className="grid gap-0 border-b border-zinc-100">
        <ComposeField
          label="To"
          value={compose.to ?? ""}
          onChange={(value) => onChange({ ...compose, to: value })}
          placeholder="recipient@example.com"
        />
        {showCc ? (
          <ComposeField
            label="Cc"
            value={compose.cc ?? ""}
            onChange={(value) => onChange({ ...compose, cc: value })}
            placeholder="cc@example.com"
          />
        ) : null}
        {showBcc ? (
          <ComposeField
            label="Bcc"
            value={compose.bcc ?? ""}
            onChange={(value) => onChange({ ...compose, bcc: value })}
            placeholder="bcc@example.com"
          />
        ) : null}
        <ComposeField
          label="Subject"
          value={compose.subject ?? ""}
          onChange={(value) => onChange({ ...compose, subject: value })}
          placeholder="Subject"
        />
      </div>

      <textarea
        value={compose.body ?? ""}
        onChange={(event) => onChange({ ...compose, body: event.target.value })}
        placeholder="Write your message…"
        className="min-h-0 flex-1 resize-none px-3 py-3 body-sm text-zinc-800 outline-none"
      />

      <div className="flex items-center justify-end gap-1.5 border-t border-zinc-100 px-3 py-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !compose.to?.trim() || !compose.subject?.trim() || !compose.body?.trim()}
          className="btn-primary focus-ring"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function ComposeField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-2 border-b border-zinc-50 px-3 py-1.5 last:border-b-0">
      <span className="w-11 shrink-0 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent body-sm text-zinc-800 outline-none placeholder:text-zinc-300"
      />
    </label>
  );
}

function ReadPanel({
  message,
  loading,
  onReply,
  onTrash,
  onBack,
}: {
  message: GmailMessageDetail;
  loading: boolean;
  onReply: () => void;
  onTrash: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2">
        <button type="button" onClick={onBack} className="btn-text">
          Back
        </button>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onReply} className="btn-secondary">
            Reply
          </button>
          <button type="button" onClick={onTrash} className="btn-danger">
            Delete
          </button>
        </div>
      </div>

      <div className="border-b border-zinc-100 px-3 py-3">
        <h2 className="text-[14px] font-semibold text-zinc-900">{message.subject}</h2>
        <div className="mt-2 grid gap-1 body-sm text-zinc-500">
          <p>
            <span className="font-medium text-zinc-700">From:</span> {message.from}
          </p>
          <p>
            <span className="font-medium text-zinc-700">To:</span> {message.to}
          </p>
          {message.cc ? (
            <p>
              <span className="font-medium text-zinc-700">Cc:</span> {message.cc}
            </p>
          ) : null}
          <p>
            <span className="font-medium text-zinc-700">Date:</span> {formatDate(message.date)}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <p className="body-sm text-zinc-400">Loading message…</p>
        ) : (
          <pre className="whitespace-pre-wrap font-sans body-md text-zinc-700">
            {message.body || message.snippet}
          </pre>
        )}
      </div>
    </div>
  );
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  return match?.[1] ?? value.trim();
}

function formatSender(value: string): string {
  const withoutEmail = value.replace(/<[^>]+>/, "").trim();
  return withoutEmail || extractEmailAddress(value);
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
