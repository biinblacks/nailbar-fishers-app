"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, requireSalonAccess } from "@/lib/salon";
import { createCheckoutSession, createPortalSession, stripeConfigured } from "@/lib/billing/stripe";
import { isPlanId } from "@/lib/billing/plans";
import { logAudit } from "@/lib/audit";
import { str, type ActionState } from "@/lib/action-state";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function startCheckoutAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const plan = str(formData, "plan");
  const { salon, role, userId } = await requireSalonAccess(slug);
  if (role !== "owner") return { error: "Only the salon owner can change the plan." };
  if (!isPlanId(plan) || plan === "starter") return { error: "Pick a paid plan." };
  if (!stripeConfigured()) return { error: "Billing is not configured yet (STRIPE_SECRET_KEY)." };

  const user = await getCurrentUser();
  let url: string;
  try {
    url = await createCheckoutSession({
      db: await createClient(),
      salonId: salon.id,
      salonName: salon.name,
      email: user?.email ?? "",
      plan,
      successUrl: `${siteUrl()}/app/${slug}/billing?checkout=success`,
      cancelUrl: `${siteUrl()}/app/${slug}/billing?checkout=cancelled`,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not start checkout." };
  }
  await logAudit({ salonId: salon.id, userId, action: "billing.checkout_started", entity: "plan", entityId: plan });
  redirect(url);
}

export async function openBillingPortalAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role } = await requireSalonAccess(slug);
  if (role !== "owner") return { error: "Only the salon owner can manage billing." };
  if (!stripeConfigured()) return { error: "Billing is not configured yet." };

  const supabase = await createClient();
  const { data: sub } = await supabase.from("salon_subscriptions").select("stripe_customer_id").eq("salon_id", salon.id).maybeSingle();
  if (!sub?.stripe_customer_id) return { error: "No billing account yet. Choose a plan first." };

  let url: string;
  try {
    url = await createPortalSession(sub.stripe_customer_id, `${siteUrl()}/app/${slug}/billing`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not open the billing portal." };
  }
  redirect(url);
}
