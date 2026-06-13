/**
 * Best-effort parser for free-text deadlines like "Before 12:00" or "14:00".
 */
export function parseTaskDeadline(deadline?: string, reference = new Date()): Date | null {
  if (!deadline?.trim()) return null;

  const text = deadline.trim().toLowerCase();
  const timeMatch = text.match(/(\d{1,2})[:.](\d{2})/);
  if (!timeMatch) return null;

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (hours > 23 || minutes > 59) return null;

  const result = new Date(reference);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export function defaultEventWindow(deadline?: string): { start: Date; end: Date } {
  const start = parseTaskDeadline(deadline) ?? new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}
