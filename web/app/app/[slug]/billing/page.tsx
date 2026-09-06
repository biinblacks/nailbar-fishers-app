import type { Metadata } from "next";
import { requireSalonAccess } from "@/lib/salon";
import { createClient } from "@/lib/supabase/server";
import { getUsage } from "@/lib/billing/limits";
import { PLAN_ORDER, PLANS, stripePriceIdFor } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckoutButton, PortalButton } from "@/components/forms/BillingForms";

export const metadata: Metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-blush-900">{label}</span>
        <span className="text-blush-800/70">
          {used} / {unlimited ? "∞" : limit}
        </span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-blush-50">
        <div className={`h-2 rounded-full ${pct >= 90 ? "bg-red-400" : "bg-blush-500"}`} style={{ width: `${unlimited ? 8 : pct}%` }} />
      </div>
    </div>
  );
}

export default async function BillingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const { slug } = await params;
  const { checkout } = await searchParams;
  const { salon, role } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const [{ plan, usage }, subRes, auditRes] = await Promise.all([
    getUsage(salon.id),
    supabase.from("salon_subscriptions").select("*").eq("salon_id", salon.id).maybeSingle(),
    role === "owner" || role === "admin"
      ? supabase.from("audit_log").select("action, entity, entity_id, created_at, user_id").eq("salon_id", salon.id).order("created_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] as never[] }),
  ]);
  const sub = subRes.data;
  const auditRows = (auditRes.data ?? []) as Array<{ action: string; entity: string | null; entity_id: string | null; created_at: string; user_id: string | null }>;
  const actorIds = Array.from(new Set(auditRows.map((a) => a.user_id).filter((id): id is string => !!id)));
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] };
  const actorName = (id: string | null) => {
    const p = (actors ?? []).find((x) => x.id === id);
    return p?.full_name || p?.email || "";
  };
  const configured = stripeConfigured();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Billing" title="Plan & usage" description="Usage resets on the first of each month. Upgrade any time; changes apply immediately." />

      {checkout === "success" && <p className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">Thank you! Your plan updates as soon as Stripe confirms the payment (usually within a few seconds).</p>}
      {checkout === "cancelled" && <p className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-800">Checkout was cancelled. No changes were made.</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-blush-900">
                {plan.name} plan{" "}
                <Badge className="ml-1 border-blush-100 bg-blush-50 capitalize text-blush-600">{sub?.status ?? "trialing"}</Badge>
              </h2>
              <p className="text-xs text-blush-800/60">
                {plan.priceMonthlyUsd === 0 ? "Free" : `$${plan.priceMonthlyUsd}/month`}
                {sub?.current_period_end ? ` · renews ${new Date(sub.current_period_end).toLocaleDateString("en-US")}` : ""}
                {sub?.cancel_at_period_end ? " · cancels at period end" : ""}
              </p>
            </div>
            {role === "owner" && sub?.stripe_customer_id && <PortalButton slug={slug} />}
          </div>
          <div className="mt-6 space-y-4">
            <Meter label="AI receptionist replies this month" used={usage.ai_messages} limit={plan.limits.aiMessages} />
            <Meter label="SMS sent this month" used={usage.sms_sent} limit={plan.limits.sms} />
            <Meter label="Active technicians" used={usage.active_staff} limit={plan.limits.staff} />
            <Meter label="AI marketing packs this month" used={usage.campaigns} limit={plan.limits.campaigns} />
          </div>
        </Card>

        <Card className="h-fit">
          <h2 className="text-lg font-semibold text-blush-900">Billing status</h2>
          <ul className="mt-3 space-y-1 text-sm text-blush-800/80">
            <li>Stripe: {configured ? "configured" : "not configured (STRIPE_SECRET_KEY)"}</li>
            <li>Pro price: {stripePriceIdFor("pro") ? "set" : "missing STRIPE_PRICE_PRO"}</li>
            <li>Premium price: {stripePriceIdFor("premium") ? "set" : "missing STRIPE_PRICE_PREMIUM"}</li>
            <li>Webhook: {process.env.STRIPE_WEBHOOK_SECRET ? "set" : "missing STRIPE_WEBHOOK_SECRET"}</li>
          </ul>
          {role !== "owner" && <p className="mt-3 text-xs text-blush-800/60">Only the salon owner can change the plan.</p>}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const current = p.id === plan.id;
          return (
            <Card key={id} className={current ? "border-2 border-blush-400" : ""}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-500">{p.name}</p>
              <p className="mt-1 text-3xl font-serif font-bold text-blush-700">{p.priceMonthlyUsd === 0 ? "Free" : `$${p.priceMonthlyUsd}`}<span className="text-sm font-sans font-normal text-blush-800/60">{p.priceMonthlyUsd ? "/mo" : ""}</span></p>
              <p className="mt-1 text-sm text-blush-800/70">{p.tagline}</p>
              <ul className="mt-4 space-y-1 text-sm text-blush-900">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <div className="mt-5">
                {current ? (
                  <button type="button" disabled className="btn-secondary w-full opacity-70">
                    Current plan
                  </button>
                ) : p.id === "starter" ? (
                  <p className="text-xs text-blush-800/60">Downgrade from the billing portal.</p>
                ) : (
                  <CheckoutButton slug={slug} plan={p.id} label={`Upgrade to ${p.name}`} disabled={role !== "owner" || !configured || !stripePriceIdFor(p.id)} />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {(role === "owner" || role === "admin") && (
        <Card>
          <h2 className="text-lg font-semibold text-blush-900">Recent account activity</h2>
          <ul className="mt-3 divide-y divide-blush-50 text-sm">
            {auditRows.map((a, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span className="text-blush-900">
                  <code className="rounded bg-blush-50 px-1 text-xs">{a.action}</code> {a.entity ? `${a.entity}${a.entity_id ? ` · ${a.entity_id.slice(0, 8)}` : ""}` : ""}
                  <span className="ml-2 text-xs text-blush-800/60">{actorName(a.user_id)}</span>
                </span>
                <span className="text-xs text-blush-800/60">{new Date(a.created_at).toLocaleString("en-US")}</span>
              </li>
            ))}
            {auditRows.length === 0 && <li className="py-2 text-blush-800/60">No activity recorded yet.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
