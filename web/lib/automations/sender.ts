import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { clampToSendWindow } from "@/lib/time";
import { renderTemplate } from "@/lib/messaging/templates";
import { MessagingNotConfigured, sendEmail, sendSms, toE164 } from "@/lib/messaging/providers";
import { checkLimit } from "@/lib/billing/limits";

type Db = SupabaseClient<Database>;

export interface SendSummary {
  sent: number;
  skipped: number;
  failed: number;
  deferred: number;
}

const SUBJECTS: Record<string, { en: string; vi: string }> = {
  appointment_reminder: { en: "Appointment reminder", vi: "Nhắc lịch hẹn" },
  review_request: { en: "Thank you for visiting", vi: "Cảm ơn bạn đã ghé tiệm" },
  comeback_reminder: { en: "We miss you", vi: "Lâu rồi không gặp" },
  birthday_promo: { en: "A birthday treat for you", vi: "Quà sinh nhật dành cho bạn" },
  new_customer_followup: { en: "How are your nails?", vi: "Móng của bạn thế nào rồi?" },
};

/**
 * Sends every due job (scheduled_for <= now). Respects the rule's sending
 * window in the salon's timezone, customer opt-out for marketing types, and
 * logs every attempt to message_log.
 */
export async function sendDueJobs(db: Db, now: Date, siteUrl: string, salonId?: string): Promise<SendSummary> {
  const summary: SendSummary = { sent: 0, skipped: 0, failed: 0, deferred: 0 };

  let query = db
    .from("automation_jobs")
    .select(
      "*, automation_rules(is_enabled, template_en, template_vi, send_hour_start, send_hour_end), customers(full_name, phone, email, marketing_opt_in), appointments(appointment_date, appointment_time, services(name), staff(full_name)), salons(name, slug, phone, timezone, google_review_link, is_active, sms_number)"
    )
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .lt("attempts", 3)
    .order("scheduled_for")
    .limit(100);
  if (salonId) query = query.eq("salon_id", salonId);
  const { data: jobs, error } = await query;
  if (error) throw new Error(`load jobs failed: ${error.message}`);

  const smsQuota = new Map<string, boolean>();

  for (const job of jobs ?? []) {
    const rule = job.automation_rules;
    const salon = job.salons;
    const customer = job.customers;

    const finish = async (status: "sent" | "skipped" | "failed" | "pending", extra: Record<string, unknown> = {}) => {
      await db
        .from("automation_jobs")
        .update({ status, attempts: job.attempts + 1, ...extra })
        .eq("id", job.id);
    };

    if (!salon || !salon.is_active || !rule || !rule.is_enabled) {
      await finish("skipped", { last_error: "rule disabled" });
      summary.skipped++;
      continue;
    }

    // Sending window (quiet hours) in the salon timezone.
    const allowedAt = clampToSendWindow(now, salon.timezone, rule.send_hour_start, rule.send_hour_end);
    if (allowedAt > now) {
      await db.from("automation_jobs").update({ scheduled_for: allowedAt.toISOString() }).eq("id", job.id);
      summary.deferred++;
      continue;
    }

    const isMarketing = job.type !== "appointment_reminder";
    if (isMarketing && customer && customer.marketing_opt_in === false) {
      await finish("skipped", { last_error: "customer opted out" });
      summary.skipped++;
      continue;
    }

    const rawRecipient = job.recipient ?? (job.channel === "sms" ? customer?.phone : customer?.email) ?? null;
    const recipient = job.channel === "sms" ? (rawRecipient ? toE164(rawRecipient) : null) : rawRecipient;
    if (!recipient) {
      await finish("skipped", { last_error: `no ${job.channel} address` });
      summary.skipped++;
      continue;
    }

    if (job.channel === "sms") {
      if (!smsQuota.has(job.salon_id)) smsQuota.set(job.salon_id, (await checkLimit(job.salon_id, "sms")).allowed);
      if (!smsQuota.get(job.salon_id)) {
        await finish("skipped", { last_error: "plan SMS limit reached this month" });
        summary.skipped++;
        continue;
      }
    }

    const language = job.language === "vi" ? "vi" : "en";
    const template = language === "vi" ? rule.template_vi : rule.template_en;
    const body = renderTemplate(
      template,
      {
        customer_name: customer?.full_name ?? "",
        salon_name: salon.name,
        salon_phone: salon.phone ?? "",
        service: job.appointments?.services?.name ?? "",
        date: job.appointments?.appointment_date ?? "",
        time: job.appointments?.appointment_time ?? "",
        technician: job.appointments?.staff?.full_name ?? "",
        review_link: `${siteUrl}/s/${salon.slug}/review${customer?.full_name ? `?name=${encodeURIComponent(customer.full_name.split(" ")[0])}` : ""}`,
        booking_link: `${siteUrl}/s/${salon.slug}/book`,
      },
      language
    );
    const subject = `${SUBJECTS[job.type]?.[language] ?? "Message"} · ${salon.name}`;

    try {
      const result = job.channel === "sms" ? await sendSms(recipient, body, salon.sms_number) : await sendEmail(recipient, subject, body);
      await db.from("message_log").insert({
        salon_id: job.salon_id,
        job_id: job.id,
        customer_id: job.customer_id,
        channel: job.channel,
        recipient,
        subject: job.channel === "email" ? subject : null,
        body,
        provider: result.provider,
        provider_message_id: result.providerMessageId,
        status: "sent",
      });
      await finish("sent", { sent_at: new Date().toISOString(), last_error: null });
      summary.sent++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "send failed";
      const notConfigured = err instanceof MessagingNotConfigured;
      await db.from("message_log").insert({
        salon_id: job.salon_id,
        job_id: job.id,
        customer_id: job.customer_id,
        channel: job.channel,
        recipient,
        subject: job.channel === "email" ? subject : null,
        body,
        provider: job.channel === "sms" ? "twilio" : "resend",
        status: notConfigured ? "skipped" : "failed",
        error: message,
      });
      // Not configured: park the job (attempts maxed) so it does not retry every run.
      await finish(notConfigured ? "skipped" : job.attempts + 1 >= 3 ? "failed" : "pending", {
        last_error: message,
        ...(notConfigured ? { attempts: 3 } : {}),
      });
      if (notConfigured) summary.skipped++;
      else summary.failed++;
    }
  }

  return summary;
}
