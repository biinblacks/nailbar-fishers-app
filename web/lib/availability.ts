import { minutesToTime, timeToMinutes } from "./format";

/**
 * Availability engine shared by the public booking page, the dashboard and
 * the AI receptionist. Pure functions: pass in the data, get slots out.
 *
 * Capacity model: each active technician is one chair. An appointment
 * assigned to a technician blocks that technician; an unassigned appointment
 * ("any technician") consumes one chair of the pool. A salon with no
 * technicians behaves like a single chair.
 */

export interface BookingRules {
  timezone: string;
  booking_slot_minutes: number;
  booking_lead_minutes: number;
  booking_window_days: number;
  booking_buffer_minutes: number;
}

export interface HoursRow {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface BusyBlock {
  staff_id: string | null;
  appointment_time: string;
  duration_minutes: number;
}

export interface SlotQuery {
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  staffId?: string | null;
  activeStaffIds: string[];
  hours: HoursRow[];
  busy: BusyBlock[];
  rules: BookingRules;
  now?: Date;
}

export interface Slot {
  time: string; // HH:MM
  /** Technicians free for this slot (empty when the salon has no technicians). */
  freeStaffIds: string[];
}

export interface SlotResult {
  slots: Slot[];
  /** Why there are no slots, when applicable. */
  reason?: "closed" | "past" | "outside_window" | "full";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(date: string): boolean {
  if (!DATE_RE.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Day-of-week (0 = Sunday) for a YYYY-MM-DD string, timezone-independent. */
export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function dayIndex(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Current wall-clock time in a timezone as { date, minutes }. */
export function nowInTimezone(timeZone: string, now: Date = new Date()): { date: string; minutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
    const hour = Number(get("hour")) % 24; // some engines emit "24" at midnight
    return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: hour * 60 + Number(get("minute")) };
  } catch {
    const iso = now.toISOString();
    return { date: iso.slice(0, 10), minutes: now.getUTCHours() * 60 + now.getUTCMinutes() };
  }
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function computeSlots(q: SlotQuery): SlotResult {
  const { date, durationMinutes, rules } = q;
  if (!isValidDate(date)) return { slots: [], reason: "outside_window" };

  const current = nowInTimezone(rules.timezone, q.now);
  const absNow = dayIndex(current.date) * 1440 + current.minutes;
  const absDayStart = dayIndex(date) * 1440;

  if (dayIndex(date) < dayIndex(current.date)) return { slots: [], reason: "past" };
  if (dayIndex(date) - dayIndex(current.date) > rules.booking_window_days) {
    return { slots: [], reason: "outside_window" };
  }

  const hours = q.hours.find((h) => h.day_of_week === dayOfWeek(date));
  if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) {
    return { slots: [], reason: "closed" };
  }

  const open = timeToMinutes(hours.open_time);
  const close = timeToMinutes(hours.close_time);
  const step = Math.max(5, rules.booking_slot_minutes);
  const buffer = Math.max(0, rules.booking_buffer_minutes);
  const earliestAbs = absNow + rules.booking_lead_minutes;

  const staffIds = q.activeStaffIds;
  const capacity = Math.max(1, staffIds.length);

  if (q.staffId && !staffIds.includes(q.staffId)) return { slots: [], reason: "full" };

  const busy = q.busy.map((b) => {
    const start = timeToMinutes(b.appointment_time);
    return { staffId: b.staff_id, start: start - buffer, end: start + b.duration_minutes + buffer };
  });

  const slots: Slot[] = [];
  for (let start = open; start + durationMinutes <= close; start += step) {
    if (absDayStart + start < earliestAbs) continue;
    const end = start + durationMinutes;
    const overlapping = busy.filter((b) => overlaps(start, end, b.start, b.end));

    if (staffIds.length === 0) {
      if (overlapping.length === 0) slots.push({ time: minutesToTime(start), freeStaffIds: [] });
      continue;
    }

    const blockedStaff = new Set(overlapping.map((b) => b.staffId).filter((id): id is string => !!id));
    const unassigned = overlapping.filter((b) => !b.staffId).length;
    const freeStaff = staffIds.filter((id) => !blockedStaff.has(id));
    // Unassigned bookings consume chairs from the free pool.
    const chairsLeft = Math.min(freeStaff.length, capacity - overlapping.length);
    if (chairsLeft <= 0) continue;

    if (q.staffId) {
      if (!freeStaff.includes(q.staffId)) continue;
      if (unassigned >= freeStaff.length) continue; // pool exhausted by "any" bookings
      slots.push({ time: minutesToTime(start), freeStaffIds: [q.staffId] });
    } else {
      slots.push({ time: minutesToTime(start), freeStaffIds: freeStaff.slice(0, chairsLeft) });
    }
  }

  return { slots, reason: slots.length === 0 ? "full" : undefined };
}

/** Lists the next N calendar dates (inclusive of today) as YYYY-MM-DD in the salon timezone. */
export function upcomingDates(timeZone: string, days: number, now: Date = new Date()): string[] {
  const { date } = nowInTimezone(timeZone, now);
  const start = dayIndex(date);
  return Array.from({ length: days }, (_, i) => new Date((start + i) * 86_400_000).toISOString().slice(0, 10));
}
