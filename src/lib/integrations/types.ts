export type GoogleConnectionStatus = {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
  scopes: string[];
  configured: boolean;
};

import type { PurchaseSearchResult } from "@/lib/tasks";

export type TaskActionResult = {
  type: "calendar" | "gmail" | "purchase-search";
  calendarEventId?: string;
  calendarLink?: string | null;
  calendarStart?: string;
  calendarEnd?: string;
  gmailMessageId?: string;
  gmailThreadId?: string | null;
  purchaseSearch?: PurchaseSearchResult;
};
