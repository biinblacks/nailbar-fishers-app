import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { languageByCode } from "@/lib/interpreter/languages";
import { deleteInterpreterSessionAction } from "@/actions/interpreter";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { SessionMetaForm } from "@/components/forms/SessionMetaForm";

export const metadata: Metadata = { title: "Conversation" };

export default async function InterpreterSessionPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const [sessionRes, turnsRes, customersRes] = await Promise.all([
    supabase.from("interpreter_sessions").select("*, customers(full_name)").eq("id", id).eq("salon_id", salon.id).maybeSingle(),
    supabase.from("interpreter_turns").select("*").eq("session_id", id).order("created_at"),
    supabase.from("customers").select("id, full_name, phone").eq("salon_id", salon.id).order("full_name").limit(500),
  ]);
  if (!sessionRes.data) notFound();
  const session = sessionRes.data;
  const turns = turnsRes.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Bee Interpreter"
        title={session.title ?? "Untitled conversation"}
        description={`${languageByCode(session.lang_a).nativeName} ⇄ ${languageByCode(session.lang_b).nativeName} · ${new Date(session.started_at).toLocaleString("en-US")}${session.customers?.full_name ? ` · ${session.customers.full_name}` : ""}`}
        actions={
          <>
            {session.customer_id && (
              <Link href={`/app/${slug}/customers/${session.customer_id}`} className="btn-secondary">
                View customer
              </Link>
            )}
            <ConfirmButton action={deleteInterpreterSessionAction} hidden={{ slug, id }} confirmText="Delete this conversation permanently?">
              Delete
            </ConfirmButton>
          </>
        }
      />

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Details</h2>
        <div className="mt-4">
          <SessionMetaForm slug={slug} id={id} title={session.title} customerId={session.customer_id} customers={customersRes.data ?? []} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Transcript</h2>
        <div className="mt-4 space-y-3">
          {turns.map((t) => (
            <div key={t.id} className={`flex ${t.speaker === "a" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${t.speaker === "a" ? "border border-blush-100 bg-white" : "bg-blush-500 text-white"}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide ${t.speaker === "a" ? "text-blush-800/50" : "text-white/70"}`}>
                  {t.speaker === "a" ? "Technician" : "Guest"} · {languageByCode(t.source_lang).nativeName} · {new Date(t.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="mt-1 text-sm">{t.source_text}</p>
                <p className={`mt-2 border-t pt-2 text-sm font-medium ${t.speaker === "a" ? "border-blush-50 text-blush-700" : "border-white/20"}`}>{t.translated_text}</p>
              </div>
            </div>
          ))}
          {turns.length === 0 && <p className="text-sm text-blush-800/60">No messages were recorded.</p>}
        </div>
      </Card>
    </div>
  );
}
