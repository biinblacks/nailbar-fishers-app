import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import { emailConfigured, smsConfigured } from "@/lib/messaging/providers";
import { cancelAutomationJobAction } from "@/actions/automations";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AutomationRuleForm } from "@/components/forms/AutomationRuleForm";
import { RunAutomationsForm } from "@/components/forms/RunAutomationsForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Automations" };
export const dynamic = "force-dynamic";

const TYPE_ORDER = ["appointment_reminder", "review_request", "new_customer_followup", "comeback_reminder", "birthday_promo"] as const;
const TYPE_LABEL: Record<(typeof TYPE_ORDER)[number], { title: string; blurb: string }> = {
  appointment_reminder: { title: "Appointment reminders", blurb: "Sent before confirmed or pending appointments. Cancelled or rescheduled bookings cancel their reminders automatically." },
  review_request: { title: "Review requests", blurb: "Sent after an appointment is marked completed. Links to your Google review page." },
  new_customer_followup: { title: "New-guest follow-up", blurb: "Sent once, after a guest's very first completed visit." },
  comeback_reminder: { title: "Comeback reminders", blurb: "Nudges guests who have not visited in a while and have nothing booked. At most once a month per guest." },
  birthday_promo: { title: "Birthday promotions", blurb: "Sent once a year to guests with a birthday on file." },
};

const STATUS_CLASS: Record<string, string> = {
  pending: "border-gold-200 bg-gold-50 text-gold-700",
  sent: "border-green-200 bg-green-50 text-green-700",
  skipped: "border-gray-200 bg-gray-100 text-gray-600",
  failed: "border-red-200 bg-red-50 text-red-600",
  cancelled: "border-gray-200 bg-gray-100 text-gray-500",
};

export default async function AutomationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon, role } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const canEdit = canManageSalon(role);

  // Make sure the default rule set exists (older salons, or if defaults were deleted).
  await supabase.rpc("ensure_automation_rules", { p_salon_id: salon.id });

  const [rulesRes, jobsRes, logRes, statsRes] = await Promise.all([
    supabase.from("automation_rules").select("*").eq("salon_id", salon.id).order("type").order("offset_minutes", { ascending: false }),
    supabase
      .from("automation_jobs")
      .select("id, type, channel, recipient, language, scheduled_for, status, last_error, customers(full_name)")
      .eq("salon_id", salon.id)
      .eq("status", "pending")
      .order("scheduled_for")
      .limit(25),
    supabase
      .from("message_log")
      .select("id, channel, recipient, body, provider, status, error, created_at, customers(full_name)")
      .eq("salon_id", salon.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("message_log").select("id", { count: "exact", head: true }).eq("salon_id", salon.id).eq("status", "sent").gte("created_at", new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ]);
  const rules = rulesRes.data ?? [];
  const jobs = jobsRes.data ?? [];
  const log = logRes.data ?? [];
  const smsReady = smsConfigured();
  const emailReady = emailConfigured();
  const cronReady = !!process.env.CRON_SECRET;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Automation"
        title="Automations"
        description="Reminders, review requests, comeback nudges, birthday treats and first-visit follow-ups — in English or Vietnamese, per guest."
        actions={canEdit ? <RunAutomationsForm slug={slug} /> : undefined}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Sent (30 days)</p>
          <p className="mt-1 text-2xl font-serif font-bold text-blush-700">{statsRes.count ?? 0}</p>
        </Card>
        <Card className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Queued</p>
          <p className="mt-1 text-2xl font-serif font-bold text-blush-700">{jobs.length}</p>
        </Card>
        <Card className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Delivery</p>
          <p className="mt-1 text-sm text-blush-900">
            SMS: {smsReady ? "ready" : "not configured"} · Email: {emailReady ? "ready" : "not configured"}
          </p>
          <p className="text-xs text-blush-800/60">Scheduler: {cronReady ? "cron every 15 min" : "manual (set CRON_SECRET + Vercel Cron)"}</p>
        </Card>
      </div>

      {!smsReady && !emailReady && (
        <p className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-800">
          No delivery provider is configured yet. Add <code>TWILIO_*</code> (SMS) or <code>RESEND_API_KEY</code> + <code>EMAIL_FROM</code> (email) to the web app&apos;s environment, or set <code>MESSAGING_DRY_RUN=true</code> to test without sending.
        </p>
      )}

      {TYPE_ORDER.map((type) => {
        const list = rules.filter((r) => r.type === type);
        if (list.length === 0) return null;
        return (
          <Card key={type}>
            <h2 className="text-lg font-semibold text-blush-900">{TYPE_LABEL[type].title}</h2>
            <p className="mt-1 text-xs text-blush-800/60">{TYPE_LABEL[type].blurb}</p>
            <div className="mt-4 space-y-3">
              {list.map((rule) => (
                <details key={rule.id} className="rounded-2xl border border-blush-50 bg-blush-50/40" open={list.length === 1}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="font-medium text-blush-900">{rule.name}</span>
                    <span className="flex items-center gap-2 text-xs">
                      <span className="uppercase text-blush-800/60">{rule.channel}</span>
                      <Badge className={rule.is_enabled ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-100 text-gray-600"}>{rule.is_enabled ? "On" : "Off"}</Badge>
                    </span>
                  </summary>
                  <div className="px-4 pb-4">
                    <AutomationRuleForm slug={slug} rule={rule} canEdit={canEdit} smsReady={smsReady} emailReady={emailReady} />
                  </div>
                </details>
              ))}
            </div>
          </Card>
        );
      })}

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Queued messages</h2>
        {jobs.length === 0 ? (
          <p className="mt-3 text-sm text-blush-800/60">Nothing queued. Turn a rule on and press &quot;Run automations now&quot; to plan messages.</p>
        ) : (
          <div className="table-shell mt-4">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Guest</th>
                  <th>To</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td className="whitespace-nowrap">{new Date(j.scheduled_for).toLocaleString("en-US")}</td>
                    <td className="capitalize">{j.type.replace(/_/g, " ")}</td>
                    <td>{j.customers?.full_name ?? "—"}</td>
                    <td className="text-xs text-blush-800/70">{j.recipient ?? "—"} · {j.channel} · {j.language}</td>
                    <td className="text-right">
                      <ConfirmButton action={cancelAutomationJobAction} hidden={{ slug, id: j.id }} confirmText="Cancel this message?" variant="secondary" className="!px-3 !py-1 text-xs">
                        Cancel
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Recent sends</h2>
        {log.length === 0 ? (
          <p className="mt-3 text-sm text-blush-800/60">No messages sent yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-blush-50">
            {log.map((m) => (
              <li key={m.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-blush-900">
                    {m.customers?.full_name ?? m.recipient} <span className="text-xs font-normal text-blush-800/60">· {m.channel} · {m.provider}</span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-blush-800/60">
                    {new Date(m.created_at).toLocaleString("en-US")}
                    <Badge className={STATUS_CLASS[m.status] ?? STATUS_CLASS.skipped}>{m.status}</Badge>
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-blush-800/80">{m.body}</p>
                {m.error && <p className="mt-1 text-xs text-red-500">{m.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-blush-800/60">
        Guests who turned off marketing on their profile only receive appointment reminders. Manage that flag on each{" "}
        <Link href={`/app/${slug}/customers`} className="text-blush-500 hover:underline">
          customer
        </Link>
        .
      </p>
    </div>
  );
}
