import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import type { PublicSalon } from "@/lib/storefront";
import { deleteKnowledgeRowAction } from "@/actions/receptionist";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ReceptionistSettingsForm } from "@/components/forms/ReceptionistSettingsForm";
import { KnowledgeRowForm, type KnowledgeTable } from "@/components/forms/KnowledgeRowForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "AI receptionist" };

const CALL_LABEL: Record<string, string> = {
  booked: "Booked",
  handoff: "Sent to a person",
  answered: "Answered",
  abandoned: "Hung up",
  none: "No answer",
};

const CALL_CLASSES: Record<string, string> = {
  booked: "border-green-200 bg-green-50 text-green-700",
  handoff: "border-gold-200 bg-gold-50 text-gold-800",
  answered: "border-blush-100 bg-blush-50 text-blush-600",
  abandoned: "border-gray-200 bg-gray-100 text-gray-600",
  none: "border-gray-200 bg-gray-100 text-gray-600",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const SECTIONS: Array<{ table: KnowledgeTable; title: string; blurb: string; label: (r: Record<string, unknown>) => string }> = [
  { table: "ai_knowledge", title: "Knowledge & tone", blurb: "Freeform notes injected into every AI reply: tone, booking flow, house rules.", label: (r) => String(r.topic) },
  { table: "faqs", title: "FAQs", blurb: "Shown on the storefront and used by the AI to answer common questions.", label: (r) => String(r.question) },
  { table: "salon_policies", title: "Policies", blurb: "Cancellation, late arrival, payment, children… the AI quotes these verbatim.", label: (r) => String(r.title) },
  { table: "promotions", title: "Promotions", blurb: "Active promotions appear on the storefront and the AI mentions them when relevant.", label: (r) => String(r.title) },
];

export default async function ReceptionistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon, role } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const canEdit = canManageSalon(role);

  const [knowledge, faqs, policies, promotions, calls] = await Promise.all([
    supabase.from("ai_knowledge").select("*").eq("salon_id", salon.id).order("topic"),
    supabase.from("faqs").select("*").eq("salon_id", salon.id).order("display_order"),
    supabase.from("salon_policies").select("*").eq("salon_id", salon.id).order("display_order"),
    supabase.from("promotions").select("*").eq("salon_id", salon.id).order("created_at", { ascending: false }),
    supabase
      .from("call_logs")
      .select("id, from_number, status, outcome, turn_count, duration_seconds, started_at")
      .eq("salon_id", salon.id)
      .order("started_at", { ascending: false })
      .limit(10),
  ]);
  const recentCalls = calls.data ?? [];
  const rowsByTable: Record<KnowledgeTable, Array<Record<string, unknown> & { id: string }>> = {
    ai_knowledge: (knowledge.data ?? []) as never,
    faqs: (faqs.data ?? []) as never,
    salon_policies: (policies.data ?? []) as never,
    promotions: (promotions.data ?? []) as never,
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const embedSnippet = `<iframe src="${siteUrl}/s/${slug}/chat" style="position:fixed;inset:0;width:100%;height:100%;border:0;z-index:9999;pointer-events:none;background:transparent" allowtransparency="true"></iframe>`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI receptionist"
        title="Receptionist & online booking"
        description="Everything the AI knows comes from this page plus your services, hours, staff and profile. Changes apply on the next message."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-blush-900">Settings</h2>
          <div className="mt-4">
            <ReceptionistSettingsForm salon={salon as PublicSalon} canEdit={canEdit} />
          </div>
        </Card>
        <Card className="h-fit space-y-4 text-sm">
          <h2 className="text-lg font-semibold text-blush-900">Where guests see it</h2>
          <p className="text-blush-800/70">
            Storefront: <a href={`/s/${slug}`} className="text-blush-500 hover:underline" target="_blank" rel="noreferrer">{`/s/${slug}`}</a>
          </p>
          <p className="text-blush-800/70">
            Booking page: <a href={`/s/${slug}/book`} className="text-blush-500 hover:underline" target="_blank" rel="noreferrer">{`/s/${slug}/book`}</a>
          </p>
          <div>
            <p className="font-medium text-blush-900">Embed the chat on any website</p>
            <p className="mt-1 text-xs text-blush-800/60">Paste before the closing body tag. Only the chat bubble is clickable.</p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-blush-50 p-3 text-[11px] text-blush-900">{embedSnippet}</pre>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Recent calls</h2>
        <p className="mt-1 text-xs text-blush-800/60">
          The last ten calls the AI answered. Turn phone answering on in Settings above.
        </p>
        {recentCalls.length === 0 ? (
          <p className="mt-4 text-sm text-blush-800/60">No calls yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-blush-800/60">
                  <th className="pb-2 pr-4 font-medium">When</th>
                  <th className="pb-2 pr-4 font-medium">From</th>
                  <th className="pb-2 pr-4 font-medium">Result</th>
                  <th className="pb-2 pr-4 font-medium">Turns</th>
                  <th className="pb-2 font-medium">Length</th>
                </tr>
              </thead>
              <tbody className="text-blush-900">
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-t border-blush-100">
                    <td className="py-2 pr-4">{new Date(call.started_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{call.from_number ?? "unknown"}</td>
                    <td className="py-2 pr-4">
                      <Badge className={CALL_CLASSES[call.outcome ?? "none"] ?? CALL_CLASSES.none}>
                        {CALL_LABEL[call.outcome ?? "none"] ?? call.status}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4">{call.turn_count}</td>
                    <td className="py-2">{call.duration_seconds != null ? formatDuration(call.duration_seconds) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {SECTIONS.map((section) => (
        <Card key={section.table}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-blush-900">{section.title}</h2>
              <p className="mt-1 text-xs text-blush-800/60">{section.blurb}</p>
            </div>
            <KnowledgeRowForm slug={slug} table={section.table} collapsible />
          </div>
          <div className="mt-5 space-y-3">
            {rowsByTable[section.table].length === 0 && <p className="text-sm text-blush-800/60">Nothing here yet.</p>}
            {rowsByTable[section.table].map((row) => (
              <details key={row.id} className="rounded-2xl border border-blush-50 bg-blush-50/40">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                  <span className="font-medium text-blush-900">{section.label(row)}</span>
                  <span className="flex items-center gap-3 text-xs">
                    {"is_active" in row && (
                      <span className={row.is_active ? "text-green-700" : "text-gray-500"}>{row.is_active ? "active" : "inactive"}</span>
                    )}
                    <span className="text-blush-500">Edit</span>
                  </span>
                </summary>
                <div className="space-y-3 px-4 pb-4">
                  <KnowledgeRowForm slug={slug} table={section.table} row={row} />
                  <ConfirmButton
                    action={deleteKnowledgeRowAction}
                    hidden={{ slug, table: section.table, id: row.id }}
                    confirmText={`Delete "${section.label(row)}"?`}
                    className="!px-4 !py-1.5 text-xs"
                  >
                    Delete
                  </ConfirmButton>
                </div>
              </details>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
