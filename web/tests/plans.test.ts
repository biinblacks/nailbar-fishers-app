import { describe, expect, it } from "vitest";
import { planFor, planFromPriceId, withinLimit } from "@/lib/billing/plans";
import { toE164 } from "@/lib/messaging/providers";

describe("plans", () => {
  it("falls back to starter for unknown plans", () => {
    expect(planFor("enterprise").id).toBe("starter");
    expect(planFor("pro").id).toBe("pro");
  });
  it("maps price ids from env", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro";
    expect(planFromPriceId("price_pro")).toBe("pro");
    expect(planFromPriceId("price_other")).toBe("starter");
  });
  it("treats -1 as unlimited", () => {
    expect(withinLimit(999, -1)).toBe(true);
    expect(withinLimit(3, 3)).toBe(false);
  });
});

describe("toE164", () => {
  it("normalises US numbers", () => {
    expect(toE164("(317) 555-0182")).toBe("+13175550182");
    expect(toE164("1 317 555 0182")).toBe("+13175550182");
    expect(toE164("+84 90 123 4567")).toBe("+84901234567");
    expect(toE164("123")).toBeNull();
  });
});
