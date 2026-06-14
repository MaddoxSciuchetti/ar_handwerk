/**
 * Action planner — runs only after Pioneer has created tasks.
 * Uses fal (FAL_API_KEY) to draft email, calendar, price, and demo integration actions.
 */

import type { IntegrationId } from "@/lib/integrations/catalog";
import {
    buildFallbackPlan,
    getDemoCatalogForPrompt,
    plannerOutputToActions,
} from "@/lib/actions/fallback-planner";
import type { PlannerOutput, ProposedAction } from "@/lib/actions/types";
import { callFalLlm, extractJsonFromLlm, getFalApiKey } from "@/lib/fal/client";
import { defaultEventWindow } from "@/lib/google/deadline";
import type { Task } from "@/lib/tasks";

const VALID_DEMO_IDS = new Set([
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
]);

type PlanTaskOptions = {
    transcript?: string;
    defaultEmail?: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isLikelyEmail(value: string | undefined | null): boolean {
    return Boolean(value && EMAIL_PATTERN.test(value.trim()));
}

function buildSystemPrompt(): string {
    const catalog = getDemoCatalogForPrompt();
    return `You are an action planner for a German field-service (handyman) task app.
Given a task, produce JSON with exactly this shape:
{
  "email": { "to": string, "subject": string, "body": string, "title": string, "reasoning": string },
  "calendar": { "summary": string, "location": string, "start": string (ISO), "end": string (ISO), "description": string, "title": string, "reasoning": string },
  "price": { "query": string, "title": string, "reasoning": string },
  "demoIntegrations": [{ "integrationId": string, "title": string, "reasoning": string, "demoDescription": string }]
}

Rules:
- Always include email, calendar, and price (3 core actions).
- email.to MUST be a valid email address (e.g. name@example.com). Use the provided defaultEmail when no explicit recipient address is known. Never put a person's name in email.to — names belong in the salutation of email.body.
- price.query must always be set; infer from material/equipment/title if no explicit item.
- demoIntegrations: pick 1-3 from this catalog only (never gmail or google-calendar):
${JSON.stringify(catalog, null, 2)}
- Write email body in professional tone; German or English matching the task context.
- Return ONLY valid JSON, no markdown.`;
}

function buildUserPrompt(task: Task, transcript?: string, defaultEmail?: string | null): string {
    const { start, end } = defaultEventWindow(task.deadline);
    const excerpt = transcript?.trim().slice(0, 1500);

    return `Task:
${JSON.stringify(
    {
        title: task.title,
        problem: task.problem,
        assignee: task.assignee,
        location: task.location,
        deadline: task.deadline,
        itemToBuy: task.itemToBuy,
        material: task.material,
        equipment: task.equipment,
        suggestedCalendarStart: start.toISOString(),
        suggestedCalendarEnd: end.toISOString(),
        defaultEmail: defaultEmail ?? undefined,
    },
    null,
    2,
)}
${excerpt ? `\nTranscript excerpt:\n${excerpt}` : ""}`;
}

function sanitizePlannerOutput(
    raw: unknown,
    task: Task,
    fallback: PlannerOutput,
): PlannerOutput {
    const data = raw as Partial<PlannerOutput>;
    const { start, end } = defaultEventWindow(task.deadline);

    const email = data.email ?? fallback.email;
    const calendar = data.calendar ?? fallback.calendar;
    const price = data.price ?? fallback.price;

    const demoIntegrations = (
        data.demoIntegrations ?? fallback.demoIntegrations
    )
        .filter(
            (d) =>
                d?.integrationId &&
                VALID_DEMO_IDS.has(d.integrationId as IntegrationId) &&
                d.title &&
                d.demoDescription,
        )
        .slice(0, 3)
        .map((d) => ({
            integrationId: d.integrationId as IntegrationId,
            title: d.title,
            reasoning: d.reasoning,
            demoDescription: d.demoDescription,
        }));

    return {
        email: {
            to: isLikelyEmail(email.to) ? email.to!.trim() : fallback.email.to,
            subject: email.subject?.trim() || fallback.email.subject,
            body: email.body?.trim() || fallback.email.body,
            title: email.title?.trim() || fallback.email.title,
            reasoning: email.reasoning ?? fallback.email.reasoning,
        },
        calendar: {
            summary: calendar.summary?.trim() || task.title,
            location: calendar.location?.trim() || task.location,
            start: calendar.start || start.toISOString(),
            end: calendar.end || end.toISOString(),
            description:
                calendar.description?.trim() || fallback.calendar.description,
            title: calendar.title?.trim() || fallback.calendar.title,
            reasoning: calendar.reasoning ?? fallback.calendar.reasoning,
        },
        price: {
            query: price.query?.trim() || fallback.price.query,
            title: price.title?.trim() || fallback.price.title,
            reasoning: price.reasoning ?? fallback.price.reasoning,
        },
        demoIntegrations:
            demoIntegrations.length > 0
                ? demoIntegrations
                : fallback.demoIntegrations,
    };
}

export async function planActionsForTask(
    task: Task,
    options?: PlanTaskOptions,
): Promise<ProposedAction[]> {
    const fallback = buildFallbackPlan(task, {
        defaultEmail: options?.defaultEmail,
    });

    if (!getFalApiKey()) {
        return plannerOutputToActions(task, fallback);
    }

    try {
        const raw = await callFalLlm(
            buildUserPrompt(task, options?.transcript, options?.defaultEmail),
            buildSystemPrompt(),
        );
        const parsed = extractJsonFromLlm(raw);
        const output = sanitizePlannerOutput(parsed, task, fallback);
        return plannerOutputToActions(task, output);
    } catch {
        return plannerOutputToActions(task, fallback);
    }
}

export async function planActionsForTasks(
    tasks: Task[],
    options?: PlanTaskOptions,
): Promise<Task[]> {
    const planned = await Promise.all(
        tasks.map(async (task) => {
            const proposedActions = await planActionsForTask(task, options);
            return {
                ...task,
                proposedActions,
                actionFlowStep: 0,
            };
        }),
    );
    return planned;
}
