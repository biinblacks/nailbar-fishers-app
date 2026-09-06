import "server-only";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { planFromPriceId, stripePriceIdFor, type PlanId } from "./plans";

let cached: Stripe | null = null;

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  cached = new Stripe(key);
  return cached;
}

/** Creates (or reuses) the Stripe customer for a salon and starts Checkout. */
export async function createCheckoutSession(opts: {
  db: SupabaseClient<Database>;
  salonId: string;
  salonName: string;
  email: string;
  plan: PlanId;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const priceId = stripePriceIdFor(opts.plan);
  if (!priceId) throw new Error(`No Stripe price configured for the ${opts.plan} plan (STRIPE_PRICE_*).`);

  const { data: sub } = await opts.db.from("salon_subscriptions").select("stripe_customer_id").eq("salon_id", opts.salonId).maybeSingle();
  let customerId = sub?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: opts.email, name: opts.salonName, metadata: { salon_id: opts.salonId } });
    customerId = customer.id;
    await opts.db.from("salon_subscriptions").upsert({ salon_id: opts.salonId, stripe_customer_id: customerId }, { onConflict: "salon_id" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    subscription_data: { metadata: { salon_id: opts.salonId } },
    metadata: { salon_id: opts.salonId, plan: opts.plan },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
  return session.url;
}

type SubStatus = Database["public"]["Enums"]["subscription_status"];

const STATUS_MAP: Record<string, SubStatus> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
  unpaid: "unpaid",
  paused: "paused",
};

function mapStatus(status: Stripe.Subscription.Status): SubStatus {
  return STATUS_MAP[status] ?? "incomplete";
}

/** Mirrors a Stripe subscription into salon_subscriptions (called from the webhook). */
export async function syncSubscription(db: SupabaseClient<Database>, sub: Stripe.Subscription): Promise<void> {
  const salonId = sub.metadata?.salon_id;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const priceId = item?.price?.id ?? null;
  const isLive = ["trialing", "active", "past_due"].includes(sub.status);
  const plan: PlanId = isLive ? planFromPriceId(priceId) : "starter";
  const periodEnd = item?.current_period_end ?? null;

  const patch = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    plan,
    status: mapStatus(sub.status),
    price_id: priceId,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  };

  if (salonId) {
    await db.from("salon_subscriptions").upsert({ salon_id: salonId, ...patch }, { onConflict: "salon_id" });
  } else {
    await db.from("salon_subscriptions").update(patch).eq("stripe_customer_id", customerId);
  }
}
