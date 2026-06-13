import type { IntegrationId } from "@/lib/integrations/catalog";
import { INTEGRATIONS } from "@/lib/integrations/catalog";
import type { PlannerDemoOutput, PlannerOutput, ProposedAction } from "@/lib/actions/types";
import type { Task } from "@/lib/tasks";
import { buildPurchaseSearchQuery } from "@/lib/tasks";
import { defaultEventWindow } from "@/lib/google/deadline";

const DEMO_INTEGRATION_IDS: IntegrationId[] = [
  "telegram",
  "whatsapp",
  "imessage",
  "slack",
  "discord",
  "microsoft-teams",
  "signal",
  "baer-ollenroth",
  "vaillant",
  "bucher-kg",
  "reisser",
  "peter-jensen",
];

function integrationName(id: IntegrationId): string {
  return INTEGRATIONS.find((i) => i.id === id)?.name ?? id;
}

function inferPriceQuery(task: Task): string {
  const explicit = buildPurchaseSearchQuery(task);
  if (explicit) return explicit;

  const parts = [task.itemToBuy, task.material, task.equipment, task.title, task.problem]
    .map((p) => p?.trim())
    .filter(Boolean);

  return parts[0] ?? task.title;
}

function buildDemoIntegrations(task: Task): PlannerDemoOutput[] {
  const demos: PlannerDemoOutput[] = [];

  if (task.itemToBuy || task.material || task.equipment) {
    demos.push({
      integrationId: "baer-ollenroth",
      title: `Order ${task.itemToBuy ?? task.material ?? task.equipment}`,
      reasoning: "Material or equipment is required for this task.",
      demoDescription: `Place order at Bär und Ollenroth for ${task.itemToBuy ?? task.material ?? task.equipment}.`,
    });
  }

  if (task.assignee) {
    demos.push({
      integrationId: "whatsapp",
      title: `Notify ${task.assignee}`,
      reasoning: "Keep the assignee updated on task progress.",
      demoDescription: `Send WhatsApp update to ${task.assignee} about "${task.title}".`,
    });
  }

  if (task.location && demos.length < 3) {
    demos.push({
      integrationId: "telegram",
      title: "Share location with team",
      reasoning: "Field team may need quick access to the job site.",
      demoDescription: `Post location update for ${task.location} in Telegram.`,
    });
  }

  if (demos.length === 0) {
    demos.push({
      integrationId: "slack",
      title: "Post task to team channel",
      reasoning: "Keep the office informed about this job.",
      demoDescription: `Share "${task.title}" summary in Slack.`,
    });
  }

  return demos.slice(0, 3);
}

export function buildFallbackPlan(
  task: Task,
  options?: { defaultEmail?: string | null },
): PlannerOutput {
  const { start, end } = defaultEventWindow(task.deadline);
  const priceQuery = inferPriceQuery(task);
  const assignee = task.assignee?.trim();
  const to = options?.defaultEmail?.trim() || "team@example.com";

  const bodyLines = [
    assignee ? `Hi ${assignee},` : "Hi,",
    "",
    `Task: ${task.title}`,
    task.problem ? `Problem: ${task.problem}` : null,
    task.location ? `Location: ${task.location}` : null,
    task.deadline ? `Deadline: ${task.deadline}` : null,
    task.itemToBuy ? `Material needed: ${task.itemToBuy}` : null,
    "",
    "Please confirm you have received this assignment.",
    "",
    "— Field Tasks",
  ].filter((line): line is string => Boolean(line));

  return {
    email: {
      to,
      subject: `Field task: ${task.title}`,
      body: bodyLines.join("\n"),
      title: assignee ? `Email ${assignee}` : "Send task summary email",
      reasoning: "Notify the assignee or team about this task.",
    },
    calendar: {
      summary: task.title,
      location: task.location,
      start: start.toISOString(),
      end: end.toISOString(),
      description: [
        task.problem ? `Problem: ${task.problem}` : null,
        task.assignee ? `Assignee: ${task.assignee}` : null,
        task.deadline ? `Deadline: ${task.deadline}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      title: "Schedule calendar block",
      reasoning: task.deadline
        ? `Block time before deadline (${task.deadline}).`
        : "Reserve time on the calendar for this job.",
    },
    price: {
      query: priceQuery,
      title: `Look up price for "${priceQuery}"`,
      reasoning: "Compare supplier prices before purchasing.",
    },
    demoIntegrations: buildDemoIntegrations(task),
  };
}

export function plannerOutputToActions(task: Task, output: PlannerOutput): ProposedAction[] {
  const actions: ProposedAction[] = [
    {
      id: `${task.id}-action-email`,
      type: "email",
      status: "proposed",
      title: output.email.title,
      reasoning: output.email.reasoning,
      emailDraft: {
        to: output.email.to,
        subject: output.email.subject,
        body: output.email.body,
      },
      executable: true,
    },
    {
      id: `${task.id}-action-calendar`,
      type: "calendar",
      status: "proposed",
      title: output.calendar.title,
      reasoning: output.calendar.reasoning,
      calendarDraft: {
        summary: output.calendar.summary,
        location: output.calendar.location,
        start: output.calendar.start,
        end: output.calendar.end,
        description: output.calendar.description,
      },
      executable: true,
    },
    {
      id: `${task.id}-action-price`,
      type: "price_search",
      status: "proposed",
      title: output.price.title,
      reasoning: output.price.reasoning,
      priceDraft: { query: output.price.query },
      executable: true,
    },
  ];

  for (const demo of output.demoIntegrations) {
    if (!DEMO_INTEGRATION_IDS.includes(demo.integrationId)) continue;
    actions.push({
      id: `${task.id}-action-demo-${demo.integrationId}`,
      type: "demo_integration",
      status: "proposed",
      title: demo.title,
      reasoning: demo.reasoning,
      integrationId: demo.integrationId,
      integrationLabel: integrationName(demo.integrationId),
      demoDescription: demo.demoDescription,
      executable: false,
    });
  }

  return actions;
}

export function getDemoCatalogForPrompt() {
  return INTEGRATIONS.filter((i) => DEMO_INTEGRATION_IDS.includes(i.id)).map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    category: i.category,
  }));
}
