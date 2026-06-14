"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  daysInMonth,
  formatEventTimeRange,
  getCalendarEventsFromTasks,
  isSameCalendarDay,
  startOfMonth,
  type TaskCalendarEvent,
} from "@/lib/calendar/task-events";
import type { Task } from "@/lib/tasks";

type CalendarViewProps = {
  tasks: Task[];
  googleConnected: boolean;
  googleEmail?: string | null;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_EVENTS_IN_CELL = 3;
const EVENT_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-violet-100 text-violet-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
];

export function CalendarView({ tasks, googleConnected, googleEmail }: CalendarViewProps) {
  const events = useMemo(
    () => getCalendarEventsFromTasks(tasks, googleEmail),
    [googleEmail, tasks],
  );
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const didAutoSelectDay = useRef(false);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => new Date(event.end).getTime() >= now);
  }, [events]);

  useEffect(() => {
    if (didAutoSelectDay.current || events.length === 0) return;

    const today = new Date();
    const todayKey = today.toDateString();
    const hasEventsToday = events.some(
      (event) => new Date(event.start).toDateString() === todayKey,
    );
    if (hasEventsToday) {
      didAutoSelectDay.current = true;
      return;
    }

    const nextEvent = upcomingEvents[0] ?? events[0];
    if (!nextEvent) return;

    const nextDay = new Date(nextEvent.start);
    setSelectedDay(nextDay);
    setViewDate(startOfMonth(nextDay));
    didAutoSelectDay.current = true;
  }, [events, upcomingEvents]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, TaskCalendarEvent[]>();
    for (const event of events) {
      const key = new Date(event.start).toDateString();
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDay.get(selectedDay.toDateString()) ?? [];

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const totalDays = daysInMonth(year, month);
    const startOffset = (first.getDay() + 6) % 7;
    const cells: Date[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push(new Date(year, month - 1, prevMonthLastDay - i));
    }

    for (let day = 1; day <= totalDays; day++) {
      cells.push(new Date(year, month, day));
    }

    let nextMonthDay = 1;
    while (cells.length < 42) {
      cells.push(new Date(year, month + 1, nextMonthDay++));
    }

    return cells;
  }, [month, year]);

  function shiftMonth(delta: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function goToToday() {
    const today = new Date();
    setViewDate(startOfMonth(today));
    setSelectedDay(today);
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="page-title-hero">Calendar</h1>
        </div>
        <button type="button" onClick={goToToday} className="btn-secondary focus-ring">
          Today
        </button>
      </div>

      <div className="widget-card flex min-h-0 flex-1 overflow-hidden !p-0">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="btn-ghost focus-ring rounded-md px-2 py-1 text-[12px] text-zinc-600"
                aria-label="Previous month"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="btn-ghost focus-ring rounded-md px-2 py-1 text-[12px] text-zinc-600"
                aria-label="Next month"
              >
                →
              </button>
            </div>
            <h2 className="text-[14px] font-semibold text-zinc-900">{monthLabel}</h2>
            <div className="w-[52px]" />
          </div>

          <div className="grid shrink-0 grid-cols-7 border-b border-zinc-100">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
            {grid.map((date) => {
              const inMonth = date.getMonth() === month;
              const isSelected = isSameCalendarDay(date, selectedDay);
              const isToday = isSameCalendarDay(date, new Date());
              const dayEvents = eventsByDay.get(date.toDateString()) ?? [];
              const visibleEvents = dayEvents.slice(0, MAX_EVENTS_IN_CELL);
              const hiddenCount = dayEvents.length - visibleEvents.length;

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => setSelectedDay(date)}
                  className={`focus-ring flex min-h-0 flex-col border-b border-r border-zinc-100 p-1 text-left transition-colors last:border-r-0 ${
                    isSelected ? "bg-blue-50/80" : "hover:bg-zinc-50/80"
                  }`}
                >
                  <div className="mb-0.5 flex items-center justify-end px-0.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium ${
                        isToday
                          ? "bg-blue-600 text-white"
                          : inMonth
                            ? "text-zinc-800"
                            : "text-zinc-300"
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                    {visibleEvents.map((event, index) => (
                      <span
                        key={`${event.taskId}-${event.start}`}
                        className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${eventColorClass(
                          event.taskId,
                          index,
                        )}`}
                      >
                        {formatEventChipLabel(event)}
                      </span>
                    ))}
                    {hiddenCount > 0 ? (
                      <span className="px-1 text-[10px] font-medium text-zinc-400">
                        +{hiddenCount} more
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-100">
          <div className="border-b border-zinc-100 px-3 py-2.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              {selectedDay.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {selectedEvents.length === 0 ? (
              <p className="body-sm text-zinc-400">
                {upcomingEvents.length > 0
                  ? `No task events on this day. See Upcoming below for your next ${upcomingEvents.length === 1 ? "event" : "events"}.`
                  : "No task events on this day."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selectedEvents.map((event) => (
                  <EventCard key={`${event.taskId}-${event.start}`} event={event} />
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-100">
            <div className="border-b border-zinc-100 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                Upcoming
              </p>
            </div>
            <div className="max-h-48 overflow-y-auto px-3 py-2">
              {upcomingEvents.length === 0 ? (
                <p className="body-sm text-zinc-400">
                  Accept a calendar action on a task to see it here.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {upcomingEvents.slice(0, 5).map((event) => (
                    <EventCard
                      key={`upcoming-${event.taskId}-${event.start}`}
                      event={event}
                      compact
                    />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function eventColorClass(taskId: string, index: number): string {
  const hash = taskId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return EVENT_COLORS[(hash + index) % EVENT_COLORS.length];
}

function formatEventChipLabel(event: TaskCalendarEvent): string {
  const start = new Date(event.start);
  const time = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${time} ${event.summary}`;
}

function EventCard({ event, compact }: { event: TaskCalendarEvent; compact?: boolean }) {
  return (
    <li className="rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-zinc-900">{event.summary}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {formatEventTimeRange(event.start, event.end)}
          </p>
          {!compact && event.location ? (
            <p className="mt-0.5 text-[11px] text-zinc-500">{event.location}</p>
          ) : null}
          <p className="mt-1 text-[10px] text-zinc-400">From task: {event.taskTitle}</p>
        </div>
        {event.htmlLink || event.dayLink ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {event.htmlLink ? (
              <a
                href={event.htmlLink}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-medium text-blue-600 hover:underline"
              >
                Open
              </a>
            ) : null}
            {event.dayLink ? (
              <a
                href={event.dayLink}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-medium text-zinc-500 hover:underline"
              >
                Day view
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
