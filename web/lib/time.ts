/** Timezone helpers shared by automations (no external deps). */

function tzOffsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return (asUtc - at.getTime()) / 60_000;
}

/** Local wall-clock date + time in a timezone → absolute instant. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm || 0);
  let offset: number;
  try {
    offset = tzOffsetMinutes(new Date(guess), timeZone);
  } catch {
    offset = 0;
  }
  return new Date(guess - offset * 60_000);
}

/** Hour (0-23) and YYYY-MM-DD of an instant in a timezone. */
export function localParts(at: Date, timeZone: string): { date: string; hour: number; minute: number; year: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(at);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24, minute: Number(get("minute")), year: Number(get("year")) };
  } catch {
    return { date: at.toISOString().slice(0, 10), hour: at.getUTCHours(), minute: at.getUTCMinutes(), year: at.getUTCFullYear() };
  }
}

/**
 * Moves an instant into the salon's allowed sending window [start, end)
 * (local hours). Returns the same instant when already inside the window.
 */
export function clampToSendWindow(at: Date, timeZone: string, startHour: number, endHour: number): Date {
  const { date, hour } = localParts(at, timeZone);
  if (hour >= startHour && hour < endHour) return at;
  const startTime = `${String(startHour).padStart(2, "0")}:00`;
  if (hour < startHour) return zonedToUtc(date, startTime, timeZone);
  // After the window: first slot tomorrow.
  const [y, m, d] = date.split("-").map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return zonedToUtc(tomorrow, startTime, timeZone);
}

export function addMinutes(at: Date, minutes: number): Date {
  return new Date(at.getTime() + minutes * 60_000);
}

/** Days from `fromDate` until the next occurrence of a month/day birthday (0 = today). */
export function daysUntilBirthday(birthday: string, fromDate: string): number | null {
  const [, bm, bd] = birthday.split("-").map(Number);
  const [fy, fm, fd] = fromDate.split("-").map(Number);
  if (!bm || !bd) return null;
  const from = Date.UTC(fy, fm - 1, fd);
  let next = Date.UTC(fy, bm - 1, bd);
  if (next < from) next = Date.UTC(fy + 1, bm - 1, bd);
  return Math.round((next - from) / 86_400_000);
}
