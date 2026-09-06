import { describe, expect, it } from "vitest";
import { clampToSendWindow, daysUntilBirthday, localParts, zonedToUtc } from "@/lib/time";

const tz = "America/Indiana/Indianapolis";

describe("time helpers", () => {
  it("converts salon wall-clock time to UTC", () => {
    expect(zonedToUtc("2026-09-07", "10:00", tz).toISOString()).toBe("2026-09-07T14:00:00.000Z");
    expect(zonedToUtc("2026-01-07", "10:00", tz).toISOString()).toBe("2026-01-07T15:00:00.000Z"); // EST
  });
  it("reads local parts back", () => {
    const lp = localParts(new Date("2026-09-07T14:00:00Z"), tz);
    expect([lp.date, lp.hour, lp.minute]).toEqual(["2026-09-07", 10, 0]);
  });
  it("defers sends outside the window", () => {
    expect(clampToSendWindow(new Date("2026-09-08T03:30:00Z"), tz, 9, 20).toISOString()).toBe("2026-09-08T13:00:00.000Z");
    expect(clampToSendWindow(new Date("2026-09-07T14:00:00Z"), tz, 9, 20).toISOString()).toBe("2026-09-07T14:00:00.000Z");
    expect(clampToSendWindow(new Date("2026-09-07T10:00:00Z"), tz, 9, 20).toISOString()).toBe("2026-09-07T13:00:00.000Z");
  });
  it("counts days until a birthday", () => {
    expect(daysUntilBirthday("1990-09-10", "2026-09-07")).toBe(3);
    expect(daysUntilBirthday("1990-09-07", "2026-09-07")).toBe(0);
    expect(daysUntilBirthday("1990-01-05", "2026-09-07")).toBe(120);
  });
});
