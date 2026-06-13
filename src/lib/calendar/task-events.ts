import type { Task } from "@/lib/tasks";

export type TaskCalendarEvent = {
  taskId: string;
  taskTitle: string;
  eventId?: string;
  htmlLink?: string | null;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
};

/** Collect Google Calendar events created from accepted task actions. */
export function getCalendarEventsFromTasks(tasks: Task[]): TaskCalendarEvent[] {
  return tasks
    .flatMap((task) => {
      const integrations = task.integrations;
      const calendarAction = task.proposedActions?.find(
        (action) => action.type === "calendar" && action.status === "done",
      );
      const draft = calendarAction?.calendarDraft;

      const start = integrations?.calendarStart ?? draft?.start;
      const end = integrations?.calendarEnd ?? draft?.end;

      if (!integrations?.calendarEventId && !start) return [];

      if (!start || !end) return [];

      return [
        {
          taskId: task.id,
          taskTitle: task.title,
          eventId: integrations?.calendarEventId,
          htmlLink: integrations?.calendarLink,
          summary: integrations?.calendarSummary ?? draft?.summary ?? task.title,
          start,
          end,
          location: integrations?.calendarLocation ?? draft?.location ?? task.location,
          description: draft?.description,
        },
      ];
    })
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function formatEventTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) {
    return `${dateFmt.format(startDate)} · ${timeFmt.format(startDate)} – ${timeFmt.format(endDate)}`;
  }

  return `${dateFmt.format(startDate)} ${timeFmt.format(startDate)} – ${dateFmt.format(endDate)} ${timeFmt.format(endDate)}`;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
