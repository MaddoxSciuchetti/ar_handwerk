"use client";

import { useMemo, useState } from "react";
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
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView({ tasks, googleConnected }: CalendarViewProps) {
  const events = useMemo(() => getCalendarEventsFromTasks(tasks), [tasks]);
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

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

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return events.filter((event) => new Date(event.end).getTime() >= now);
  }, [events]);

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const totalDays = daysInMonth(year, month);
    const startOffset = (first.getDay() + 6) % 7;
    const cells: Array<{ date: Date | null; key: string }> = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: null, key: `pad-${i}` });
    }
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      cells.push({ date, key: date.toISOString() });
    }
    return cells;
  }, [month, year]);

  function shiftMonth(delta: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="page-title">Calendar</h1>
        <p className="page-desc">
          Events you accepted from tasks appear here.{" "}
          {googleConnected
            ? "They are also synced to your Google Calendar."
            : "Connect Google in Settings to create live calendar events."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="widget-card flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="btn-ghost px-2 py-1 text-[12px]">
              ←
            </button>
            <h2 className="text-[13px] font-semibold text-zinc-900">{monthLabel}</h2>
            <button type="button" onClick={() => shiftMonth(1)} className="btn-ghost px-2 py-1 text-[12px]">
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell) => {
              if (!cell.date) {
                return <div key={cell.key} className="aspect-square" />;
              }

              const inMonth = cell.date.getMonth() === month;
              const isSelected = isSameCalendarDay(cell.date, selectedDay);
              const isToday = isSameCalendarDay(cell.date, new Date());
              const dayEvents = eventsByDay.get(cell.date.toDateString()) ?? [];

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => setSelectedDay(cell.date!)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg text-[11px] transition-colors ${
                    isSelected
                      ? "bg-zinc-900 text-white"
                      : isToday
                        ? "bg-zinc-100 text-zinc-900"
                        : inMonth
                          ? "text-zinc-700 hover:bg-zinc-50"
                          : "text-zinc-300"
                  }`}
                >
                  <span className="font-medium">{cell.date.getDate()}</span>
                  {dayEvents.length > 0 ? (
                    <span
                      className={`mt-0.5 h-1 w-1 rounded-full ${
                        isSelected ? "bg-white" : "bg-blue-500"
                      }`}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="widget-card flex flex-col gap-2">
            <h2 className="text-[12px] font-semibold text-zinc-900">
              {selectedDay.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            {selectedEvents.length === 0 ? (
              <p className="body-sm text-zinc-400">No task events on this day.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {selectedEvents.map((event) => (
                  <EventCard key={`${event.taskId}-${event.start}`} event={event} />
                ))}
              </ul>
            )}
          </div>

          <div className="widget-card flex flex-col gap-2">
            <h2 className="text-[12px] font-semibold text-zinc-900">Upcoming from tasks</h2>
            {upcomingEvents.length === 0 ? (
              <p className="body-sm text-zinc-400">
                Accept a calendar action on a task to see it here.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {upcomingEvents.slice(0, 5).map((event) => (
                  <EventCard key={`upcoming-${event.taskId}-${event.start}`} event={event} compact />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
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
        {event.htmlLink ? (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[10px] font-medium text-blue-600 hover:underline"
          >
            Open
          </a>
        ) : null}
      </div>
    </li>
  );
}
