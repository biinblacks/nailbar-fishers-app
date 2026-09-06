import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFor, withinLimit, type Plan } from "./plans";

export type LimitKind = "staff" | "ai_messages" | "sms" | "campaigns";

export interface LimitCheck {
  allowed: boolean;
  used: number;
  limit: number; // -1 = unlimited
  plan: Plan;
  planName: string;
}

export interface UsageSnapshot {
  ai_messages: number;
  sms_sent: number;
  emails_sent: number;
  active_staff: number;
  campaigns: number;
}

/** Current plan + this month's usage for a salon (service role: used by workers too). */
export async function getUsage(salonId: string): Promise<{ plan: Plan; usage: UsageSnapshot }> {
  const db = createAdminClient();
  const [subRes, usageRes, campaignsRes] = await Promise.all([
    db.from("salon_subscriptions").select("plan, status").eq("salon_id", salonId).maybeSingle(),
    db.rpc("salon_monthly_usage", { p_salon_id: salonId }),
    db
      .from("campaign_assets")
      .select("campaign_id, generation", { count: "exact", head: false })
      .eq("salon_id", salonId)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ]);
  const row = Array.isArray(usageRes.data) ? usageRes.data[0] : null;
  const generations = new Set((campaignsRes.data ?? []).map((a) => `${a.campaign_id}:${a.generation}`)).size;
  const active = !subRes.data || ["trialing", "active", "past_due"].includes(subRes.data.status);
  return {
    plan: planFor(active ? subRes.data?.plan : "starter"),
    usage: {
      ai_messages: Number(row?.ai_messages ?? 0),
      sms_sent: Number(row?.sms_sent ?? 0),
      emails_sent: Number(row?.emails_sent ?? 0),
      active_staff: Number(row?.active_staff ?? 0),
      campaigns: generations,
    },
  };
}

export async function checkLimit(salonId: string, kind: LimitKind): Promise<LimitCheck> {
  const { plan, usage } = await getUsage(salonId);
  const used = kind === "staff" ? usage.active_staff : kind === "ai_messages" ? usage.ai_messages : kind === "sms" ? usage.sms_sent : usage.campaigns;
  const limit = kind === "staff" ? plan.limits.staff : kind === "ai_messages" ? plan.limits.aiMessages : kind === "sms" ? plan.limits.sms : plan.limits.campaigns;
  return { allowed: withinLimit(used, limit), used, limit, plan, planName: plan.name };
}
