import { describe, expect, it } from "vitest";
import { renderTemplate } from "@/lib/messaging/templates";

describe("renderTemplate", () => {
  it("fills placeholders in English", () => {
    const out = renderTemplate("Hi {{customer_name}}, {{service}} on {{date}} at {{time}}{{technician_with}}. {{unknown}} Call {{salon_phone}}.", { customer_name: "Jane Doe", service: "Gel X", date: "2026-09-07", time: "14:30", technician: "Mai", salon_phone: "(317) 555" }, "en");
    expect(out).toBe("Hi Jane, Gel X on Mon, Sep 7 at 2:30 PM with Mai. Call (317) 555.");
  });
  it("fills placeholders in Vietnamese with 24h time", () => {
    const out = renderTemplate("Chào {{customer_name}}, {{service}} lúc {{time}}{{technician_with}}.", { customer_name: "Lan Nguyen", service: "Gel X", time: "14:30", technician: "" }, "vi");
    expect(out).toBe("Chào Lan, Gel X lúc 14:30.");
  });
});
