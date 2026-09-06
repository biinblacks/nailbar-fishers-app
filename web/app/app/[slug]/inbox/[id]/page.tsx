import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { formatDate, formatTime } from "@/lib/format";
import { setConversationFlagsAction } from "@/actions/inbox";
import { smsConfigured } from "@/lib/messaging/providers";
import { ConversationReplyForm } from "@/components/forms/ConversationReplyForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const [convRes, msgRes, apptRes] = await Promise.all([
    supabase.from("chat_conversations").select("*").eq("id", id).eq("salon_id", salon.id).maybeSingle(),
    supabase.from("chat_messages").select("id, role, content, created_at").eq("conversation_id", id).order("created_at"),
    supabase
      .from("appointments")
      .select("id, appointment_date, appointment_time, status, services(name)")
      .eq("salon_id", salon.id)
      .eq("conversation_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!convRes.data) notFound();
  const conv = convRes.data as {
    customer_name: string | null;
    customer_phone: string | null;
    contact_number: string | null;
    customer_id: string | null;
    needs_human: boolean;
    resolved_at: string | null;
    channel: string;
    created_at: string;
  };
  const replyTo = conv.contact_number ?? conv.customer_phone;
  const messages = (msgRes.data ?? []) as Array<{ id: string; role: string; content: string; created_at: string; sent_by: string | null; channel: string }>;
  const appointments = (apptRes.data ?? []) as unknown as Array<{ id: string; appointment_date: string; appointment_time: string; status: string; services: { name: string } | null }>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Inbox"
        title={conv.customer_name ?? "Anonymous guest"}
        description={`${conv.customer_phone ? `${conv.customer_phone} · ` : ""}${conv.channel} chat started ${new Date(conv.created_at).toLocaleString("en-US")}`}
        actions={
          <>
            {conv.customer_id && (
              <Link href={`/app/${slug}/customers/${conv.customer_id}`} className="btn-secondary">
                View customer
              </Link>
            )}
            <form action={setConversationFlagsAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="needs_human" value={conv.needs_human ? "true" : "false"} />
              <input type="hidden" name="resolved" value={conv.resolved_at ? "false" : "true"} />
              <button type="submit" className={conv.resolved_at ? "btn-secondary" : "btn-primary"}>
                {conv.resolved_at ? "Reopen" : "Mark resolved"}
              </button>
            </form>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {conv.resolved_at ? (
          <Badge className="border-green-200 bg-green-50 text-green-700">Resolved</Badge>
        ) : conv.needs_human ? (
          <Badge className="border-gold-200 bg-gold-50 text-gold-700">Needs a human</Badge>
        ) : (
          <Badge className="border-blush-100 bg-blush-50 text-blush-600">AI handled</Badge>
        )}
        {!conv.resolved_at && (
          <form action={setConversationFlagsAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="needs_human" value={conv.needs_human ? "false" : "true"} />
            <input type="hidden" name="resolved" value="false" />
            <button type="submit" className="text-xs font-medium text-blush-500 hover:underline">
              {conv.needs_human ? "Clear flag" : "Flag for follow-up"}
            </button>
          </form>
        )}
      </div>

      {appointments.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-blush-900">Booked from this chat</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {appointments.map((a) => (
              <li key={a.id}>
                <Link href={`/app/${slug}/appointments/${a.id}`} className="text-blush-900 hover:underline">
                  {a.services?.name ?? "Service"} · {formatDate(a.appointment_date)} at {formatTime(a.appointment_time)}
                </Link>
                <span className="ml-2 text-xs capitalize text-blush-800/60">{a.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Transcript</h2>
        <div className="mt-4 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-blush-500 text-white" : "bg-blush-50 text-blush-900"}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
                <p className={`mt-1 text-[10px] ${m.role === "user" ? "text-white/70" : "text-blush-800/50"}`}>
                  {m.role === "assistant" && (m.sent_by ? "Staff · " : "AI · ")}
                  {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-blush-800/60">No messages.</p>}
        </div>
        <div className="mt-6 border-t border-blush-50 pt-5">
          <ConversationReplyForm slug={slug} id={id} to={replyTo} smsReady={smsConfigured()} />
        </div>
      </Card>
    </div>
  );
}
