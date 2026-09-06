/** Plan catalogue. Price IDs come from Stripe (env), limits live here. */
export type PlanId = "starter" | "pro" | "premium";

export interface PlanLimits {
  staff: number; // active technicians (-1 = unlimited)
  aiMessages: number; // AI receptionist replies per month
  sms: number; // SMS per month
  campaigns: number; // AI marketing generations per month
}

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  tagline: string;
  limits: PlanLimits;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 0,
    tagline: "Everything to run one small salon.",
    limits: { staff: 3, aiMessages: 300, sms: 100, campaigns: 3 },
    features: ["Online booking + storefront", "AI receptionist (300 replies/mo)", "Bee Interpreter", "Appointment reminders (100 SMS/mo)", "3 AI marketing packs/mo"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 79,
    tagline: "For busy salons that live on repeat guests.",
    limits: { staff: 10, aiMessages: 3000, sms: 1000, campaigns: 30 },
    features: ["Everything in Starter", "Up to 10 technicians", "AI receptionist (3,000 replies/mo)", "All automations (1,000 SMS/mo)", "30 AI marketing packs/mo", "Auto-publish to Facebook & Instagram"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceMonthlyUsd: 149,
    tagline: "Multi-chair salons and small chains.",
    limits: { staff: -1, aiMessages: 15000, sms: 5000, campaigns: -1 },
    features: ["Everything in Pro", "Unlimited technicians", "AI receptionist (15,000 replies/mo)", "5,000 SMS/mo", "Unlimited marketing packs", "Custom domain", "Priority support"],
  },
};

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "premium"];

export function isPlanId(value: string | null | undefined): value is PlanId {
  return value === "starter" || value === "pro" || value === "premium";
}

export function planFor(value: string | null | undefined): Plan {
  return PLANS[isPlanId(value) ? value : "starter"];
}

export function stripePriceIdFor(plan: PlanId): string | null {
  if (plan === "pro") return process.env.STRIPE_PRICE_PRO ?? null;
  if (plan === "premium") return process.env.STRIPE_PRICE_PREMIUM ?? null;
  return null;
}

export function planFromPriceId(priceId: string | null | undefined): PlanId {
  if (!priceId) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return "premium";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "starter";
}

export function withinLimit(used: number, limit: number): boolean {
  return limit < 0 || used < limit;
}
