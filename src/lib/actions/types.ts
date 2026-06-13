import type { IntegrationId } from "@/lib/integrations/catalog";
import type { TaskIntegrations } from "@/lib/tasks";

export type ActionStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "executing"
  | "done"
  | "failed";

export type CoreActionType = "email" | "calendar" | "price_search";
export type DemoActionType = "demo_integration";
export type ActionType = CoreActionType | DemoActionType;

export type ProposedAction = {
  id: string;
  type: ActionType;
  status: ActionStatus;
  title: string;
  reasoning?: string;
  emailDraft?: { to: string; subject: string; body: string };
  calendarDraft?: {
    summary: string;
    location?: string;
    start: string;
    end: string;
    description?: string;
  };
  priceDraft?: { query: string };
  integrationId?: IntegrationId;
  integrationLabel?: string;
  demoDescription?: string;
  executable?: boolean;
  executionResult?: TaskIntegrations;
};

export type PlannerCoreOutput = {
  email: { to: string; subject: string; body: string; title: string; reasoning?: string };
  calendar: {
    summary: string;
    location?: string;
    start: string;
    end: string;
    description?: string;
    title: string;
    reasoning?: string;
  };
  price: { query: string; title: string; reasoning?: string };
};

export type PlannerDemoOutput = {
  integrationId: IntegrationId;
  title: string;
  reasoning?: string;
  demoDescription: string;
};

export type PlannerOutput = PlannerCoreOutput & {
  demoIntegrations: PlannerDemoOutput[];
};
