import { describe, expect, it } from "vitest";
import { computeSlots } from "@/lib/availability";

const rules = { timezone: "UTC", booking_slot_minutes: 30, booking_lead_minutes: 60, booking_window_days: 60, booking_buffer_minutes: 0 };
const hours = [
  { day_of_week: 1, open_time: "09:00", close_time: "12:00", is_closed: false },
  { day_of_week: 0, open_time: null, close_time: null, is_closed: true },
];
const now = new Date("2026-09-07T08:00:00Z"); // Monday 08:00 UTC

describe("computeSlots", () => {
  it("lists every slot inside opening hours", () => {
    const r = computeSlots({ date: "2026-09-07", durationMinutes: 60, activeStaffIds: ["a", "b"], hours, busy: [], rules, now });
    expect(r.slots.map((s) => s.time)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
  });
  it("respects the lead time", () => {
    const r = computeSlots({ date: "2026-09-07", durationMinutes: 60, activeStaffIds: ["a"], hours, busy: [], rules, now: new Date("2026-09-07T08:30:00Z") });
    expect(r.slots[0].time).toBe("09:30");
  });
  it("blocks a booked technician but keeps the other free", () => {
    const busy = [{ staff_id: "a", appointment_time: "09:00", duration_minutes: 60 }];
    expect(computeSlots({ date: "2026-09-07", durationMinutes: 60, activeStaffIds: ["a", "b"], hours, busy, rules, now }).slots[0]).toEqual({ time: "09:00", freeStaffIds: ["b"] });
    expect(computeSlots({ date: "2026-09-07", durationMinutes: 60, staffId: "a", activeStaffIds: ["a", "b"], hours, busy, rules, now }).slots[0].time).toBe("10:00");
  });
  it("treats unassigned bookings as occupied chairs", () => {
    const busy = [
      { staff_id: null, appointment_time: "09:00", duration_minutes: 60 },
      { staff_id: null, appointment_time: "09:00", duration_minutes: 60 },
    ];
    expect(computeSlots({ date: "2026-09-07", durationMinutes: 60, activeStaffIds: ["a", "b"], hours, busy, rules, now }).slots[0].time).toBe("10:00");
  });
  it("reports why there are no slots", () => {
    expect(computeSlots({ date: "2026-09-06", durationMinutes: 30, activeStaffIds: [], hours, busy: [], rules, now }).reason).toBe("past");
    expect(computeSlots({ date: "2026-09-13", durationMinutes: 30, activeStaffIds: [], hours, busy: [], rules, now }).reason).toBe("closed");
    expect(computeSlots({ date: "2026-12-30", durationMinutes: 30, activeStaffIds: [], hours, busy: [], rules, now }).reason).toBe("outside_window");
  });
  it("applies buffers around bookings", () => {
    const busy = [{ staff_id: null, appointment_time: "09:00", duration_minutes: 60 }];
    const r = computeSlots({ date: "2026-09-07", durationMinutes: 30, activeStaffIds: [], hours, busy, rules: { ...rules, booking_buffer_minutes: 15, booking_lead_minutes: 0 }, now });
    expect(r.slots.map((s) => s.time)).toEqual(["10:30", "11:00", "11:30"]);
  });
  it("uses the salon timezone for 'now'", () => {
    const r = computeSlots({ date: "2026-09-07", durationMinutes: 60, activeStaffIds: ["a"], hours, busy: [], rules: { ...rules, timezone: "America/Indiana/Indianapolis" }, now: new Date("2026-09-06T22:00:00Z") });
    expect(r.slots).toHaveLength(5);
  });
});
