import type { Task } from "@/lib/tasks";
import { getCalendarClient } from "@/lib/google/client";
import { defaultEventWindow } from "@/lib/google/deadline";
import { getGoogleTokens } from "@/lib/google/tokens";
import { buildGoogleCalendarEventLink } from "@/lib/calendar/google-links";

const DEFAULT_TIME_ZONE = "Europe/Berlin";

export type CalendarDraft = {
  summary?: string;
  location?: string;
  start?: string;
  end?: string;
  description?: string;
};

export async function createCalendarEventFromTask(
  userId: string,
  task: Task,
  overrides?: CalendarDraft,
) {
  const calendar = await getCalendarClient(userId);
  const defaults = defaultEventWindow(task.deadline);
  const start = overrides?.start ? new Date(overrides.start) : defaults.start;
  const end = overrides?.end ? new Date(overrides.end) : defaults.end;

  const description =
    overrides?.description?.trim() ||
    [
      task.problem ? `Problem: ${task.problem}` : null,
      task.assignee ? `Assignee: ${task.assignee}` : null,
      task.deadline ? `Deadline note: ${task.deadline}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const tokens = getGoogleTokens(userId);

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: overrides?.summary?.trim() || task.title,
      description: description || undefined,
      location: overrides?.location?.trim() || task.location,
      start: { dateTime: start.toISOString(), timeZone: DEFAULT_TIME_ZONE },
      end: { dateTime: end.toISOString(), timeZone: DEFAULT_TIME_ZONE },
    },
  });

  const eventId = response.data.id ?? "";
  const htmlLink =
    eventId && tokens?.email
      ? buildGoogleCalendarEventLink(eventId, tokens.email)
      : (response.data.htmlLink ?? null);

  return {
    eventId,
    htmlLink,
    calendarAccount: tokens?.email ?? null,
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
