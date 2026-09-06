import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { addMinutes, daysUntilBirthday, localParts, zonedToUtc } from "@/lib/time";

type Db = SupabaseClient<Database>;
type Rule = Database["public"]["Tables"]["automation_rules"]["Row"];
type JobInsert = Database["public"]["Tables"]["automation_jobs"]["Insert"];

export interface PlannerSalon {
  id: string;
  timezone: string;
}

interface CustomerLite {
  id: string;
  phone: string;
  email: string | null;
  preferred_language: string | null;
}

function recipientFor(channel: "sms" | "email", c: { phone: string | null; email: string | null }): string | null {
  return channel === "sms" ? c.phone : c.email;
}

function lang(c: { preferred_language: string | null }): string {
  return c.preferred_language === "vi" ? "vi" : "en";
}

/**
 * Turns enabled rules into queued jobs. Every job carries a dedupe_key so the
 * planner can run as often as you like (every 15 minutes on Vercel Cron).
 */
export async function planJobsForSalon(db: Db, salon: PlannerSalon, rules: Rule[], now: Date): Promise<number> {
  const jobs: JobInsert[] = [];
  const today = localParts(now, salon.timezone).date;
  const inDays = (n: number) => {
    const [y, m, d] = today.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };

  // ---- Appointment reminders --------------------------------------------
  const reminderRules = rules.filter((r) => r.is_enabled && r.type === "appointment_reminder");
  if (reminderRules.length) {
    const horizonDays = Math.ceil(Math.max(...reminderRules.map((r) => r.offset_minutes)) / 1440) + 1;
    const { data: appts } = await db
      .from("appointments")
      .select("id, customer_id, customer_phone, customer_email, appointment_date, appointment_time, customers(preferred_language, marketing_opt_in)")
      .eq("salon_id", salon.id)
      .in("status", ["pending", "confirmed"])
      .gte("appointment_date", today)
      .lte("appointment_date", inDays(horizonDays))
      .limit(500);

    for (const a of appts ?? []) {
      const start = zonedToUtc(a.appointment_date, a.appointment_time, salon.timezone);
      if (start <= now) continue;
      for (const rule of reminderRules) {
        const scheduledFor = addMinutes(start, -rule.offset_minutes);
        // Too late to be useful (more than an hour past the intended time) → skip.
        if (scheduledFor.getTime() < now.getTime() - 60 * 60_000) continue;
        const recipient = recipientFor(rule.channel, { phone: a.customer_phone, email: a.customer_email });
        jobs.push({
          salon_id: salon.id,
          rule_id: rule.id,
          type: "appointment_reminder",
          customer_id: a.customer_id,
          appointment_id: a.id,
          channel: rule.channel,
          recipient,
          language: lang({ preferred_language: a.customers?.preferred_language ?? null }),
          scheduled_for: scheduledFor.toISOString(),
          dedupe_key: `reminder:${a.id}:${rule.id}:${a.appointment_date}T${a.appointment_time.slice(0, 5)}`,
        });
      }
    }
  }

  // ---- Review requests + new-customer follow-ups (after completion) ------
  const afterRules = rules.filter((r) => r.is_enabled && (r.type === "review_request" || r.type === "new_customer_followup"));
  if (afterRules.length) {
    const since = new Date(now.getTime() - 3 * 86_400_000).toISOString();
    const { data: completed } = await db
      .from("appointments")
      .select("id, customer_id, customer_phone, customer_email, updated_at, review_requested, customers(preferred_language)")
      .eq("salon_id", salon.id)
      .eq("status", "completed")
      .gte("updated_at", since)
      .limit(500);

    for (const a of completed ?? []) {
      if (!a.customer_id) continue;
      const completedAt = new Date(a.updated_at);
      for (const rule of afterRules) {
        if (rule.type === "review_request" && !a.review_requested) continue;
        let dedupe = `review:${a.id}`;
        if (rule.type === "new_customer_followup") {
          const { count } = await db
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("salon_id", salon.id)
            .eq("customer_id", a.customer_id)
            .eq("status", "completed");
          if ((count ?? 0) !== 1) continue; // only their very first completed visit
          dedupe = `followup:${a.customer_id}`;
        }
        jobs.push({
          salon_id: salon.id,
          rule_id: rule.id,
          type: rule.type,
          customer_id: a.customer_id,
          appointment_id: a.id,
          channel: rule.channel,
          recipient: recipientFor(rule.channel, { phone: a.customer_phone, email: a.customer_email }),
          language: lang({ preferred_language: a.customers?.preferred_language ?? null }),
          scheduled_for: addMinutes(completedAt, rule.offset_minutes).toISOString(),
          dedupe_key: dedupe,
        });
      }
    }
  }

  // ---- Comeback reminders -------------------------------------------------
  for (const rule of rules.filter((r) => r.is_enabled && r.type === "comeback_reminder" && r.interval_days)) {
    const cutoff = new Date(now.getTime() - (rule.interval_days ?? 35) * 86_400_000).toISOString();
    const { data: customers } = await db
      .from("customers")
      .select("id, phone, email, preferred_language")
      .eq("salon_id", salon.id)
      .eq("marketing_opt_in", true)
      .lte("last_visit_at", cutoff)
      .limit(300);
    if (!customers?.length) continue;

    const ids = customers.map((c) => c.id);
    const { data: upcoming } = await db
      .from("appointments")
      .select("customer_id")
      .eq("salon_id", salon.id)
      .in("customer_id", ids)
      .in("status", ["pending", "confirmed"])
      .gte("appointment_date", today);
    const hasUpcoming = new Set((upcoming ?? []).map((u) => u.customer_id));

    const month = today.slice(0, 7);
    for (const c of customers as CustomerLite[]) {
      if (hasUpcoming.has(c.id)) continue;
      jobs.push({
        salon_id: salon.id,
        rule_id: rule.id,
        type: "comeback_reminder",
        customer_id: c.id,
        channel: rule.channel,
        recipient: recipientFor(rule.channel, c),
        language: lang(c),
        scheduled_for: now.toISOString(),
        dedupe_key: `comeback:${c.id}:${month}`,
      });
    }
  }

  // ---- Birthday promos ----------------------------------------------------
  for (const rule of rules.filter((r) => r.is_enabled && r.type === "birthday_promo")) {
    const { data: customers } = await db
      .from("customers")
      .select("id, phone, email, preferred_language, birthday")
      .eq("salon_id", salon.id)
      .eq("marketing_opt_in", true)
      .not("birthday", "is", null)
      .limit(2000);
    const lead = rule.interval_days ?? 0;
    for (const c of customers ?? []) {
      const days = daysUntilBirthday(c.birthday as string, today);
      if (days === null || days !== lead) continue;
      jobs.push({
        salon_id: salon.id,
        rule_id: rule.id,
        type: "birthday_promo",
        customer_id: c.id,
        channel: rule.channel,
        recipient: recipientFor(rule.channel, c),
        language: lang(c),
        scheduled_for: now.toISOString(),
        dedupe_key: `birthday:${c.id}:${localParts(now, salon.timezone).year}`,
      });
    }
  }

  if (jobs.length === 0) return 0;
  const { data, error } = await db
    .from("automation_jobs")
    .upsert(jobs, { onConflict: "dedupe_key", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(`plan failed: ${error.message}`);
  return data?.length ?? 0;
}
