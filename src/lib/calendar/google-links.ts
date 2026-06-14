function toBase64Url(value: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Build a Google Calendar event URL that opens in the connected account. */
export function buildGoogleCalendarEventLink(eventId: string, calendarEmail: string): string {
  const eid = toBase64Url(`${eventId} ${calendarEmail}`);
  const params = new URLSearchParams({ eid, authuser: calendarEmail });
  return `https://calendar.google.com/calendar/event?${params.toString()}`;
}

/** Fallback when a direct event link fails — opens the day view in the connected account. */
export function buildGoogleCalendarDayLink(isoStart: string, calendarEmail: string): string {
  const date = new Date(isoStart);
  const params = new URLSearchParams({ authuser: calendarEmail });
  return `https://calendar.google.com/calendar/r/day/${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}?${params.toString()}`;
}

export function resolveGoogleCalendarEventLink(options: {
  eventId?: string;
  storedLink?: string | null;
  calendarEmail?: string | null;
  start?: string;
}): string | null {
  const { eventId, storedLink, calendarEmail, start } = options;
  if (eventId && calendarEmail) {
    return buildGoogleCalendarEventLink(eventId, calendarEmail);
  }
  if (storedLink && calendarEmail) {
    const url = new URL(storedLink);
    url.hostname = "calendar.google.com";
    url.searchParams.set("authuser", calendarEmail);
    return url.toString();
  }
  if (start && calendarEmail) {
    return buildGoogleCalendarDayLink(start, calendarEmail);
  }
  return storedLink ?? null;
}
