import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { planJobsForSalon } from "./planner";
import { sendDueJobs, type SendSummary } from "./sender";

export interface RunSummary extends SendSummary {
  salons: number;
  planned: number;
  ranAt: string;
}

/**
 * One automation tick: plan new jobs for every salon with enabled rules,
 * then send whatever is due. Safe to call concurrently thanks to dedupe keys.
 */
export async function runAutomations(opts: { salonId?: string; siteUrl: string; now?: Date } = { siteUrl: "" }): Promise<RunSummary> {
  const db = createAdminClient();
  const now = opts.now ?? new Date();

  let rulesQuery = db.from("automation_rules").select("*, salons!inner(id, timezone, is_active)").eq("is_enabled", true);
  if (opts.salonId) rulesQuery = rulesQuery.eq("salon_id", opts.salonId);
  const { data: rules, error } = await rulesQuery;
  if (error) throw new Error(`load rules failed: ${error.message}`);

  const bySalon = new Map<string, { salon: { id: string; timezone: string }; rules: NonNullable<typeof rules> }>();
  for (const rule of rules ?? []) {
    const s = rule.salons;
    if (!s || !s.is_active) continue;
    const entry = bySalon.get(s.id) ?? { salon: { id: s.id, timezone: s.timezone }, rules: [] };
    entry.rules.push(rule);
    bySalon.set(s.id, entry);
  }

  let planned = 0;
  for (const { salon, rules: salonRules } of bySalon.values()) {
    try {
      planned += await planJobsForSalon(db, salon, salonRules, now);
    } catch (err) {
      console.error(`[automations] planning failed for salon ${salon.id}`, err);
    }
  }

  const sendSummary = await sendDueJobs(db, now, opts.siteUrl, opts.salonId);
  return { salons: bySalon.size, planned, ...sendSummary, ranAt: now.toISOString() };
}
