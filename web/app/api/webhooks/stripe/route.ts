import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, syncSubscription } from "@/lib/billing/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe → salon_subscriptions. Configure the endpoint in Stripe with events:
 * checkout.session.completed, customer.subscription.created/updated/deleted.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` }, { status: 400 });
  }

  const db = createAdminClient();
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id);
          await syncSubscription(db, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(db, event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler failed", err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
