import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Inbox" };

interface ConversationRow {
  id: string;
  session_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_id: string | null;
  needs_human: boolean;
  resolved_at: string | null;
  channel: string;
  message_count: number;
  last_message_at: string;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "needs_human", label: "Needs a human" },
  { key: "booked", label: "With customer" },
] as const;

export default async function InboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { slug } = await params;
  const { filter = "all" } = await searchParams;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  let query = supabase
    .from("chat_conversations")
    .select("id, session_id, customer_name, customer_phone, customer_id, needs_human, resolved_at, channel, message_count, last_message_at")
    .eq("salon_id", salon.id)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (filter === "needs_human") query = query.eq("needs_human", true).is("resolved_at", null);
  if (filter === "booked") query = query.not("customer_id", "is", null);

  const { data } = await query;
  const conversations = (data ?? []) as ConversationRow[];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI receptionist"
        title="Inbox"
        description="Every chat with the AI receptionist. Conversations flagged for a human need a call or text back."
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/app/${slug}/inbox?filter=${f.key}`}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium ${filter === f.key ? "border-blush-500 bg-blush-500 text-white" : "border-blush-200 bg-white text-blush-700 hover:bg-blush-50"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Chats from your storefront and embedded widget will appear here."
        />
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Guest</th>
                <th>Channel</th>
                <th>Messages</th>
                <th>Last activity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/${slug}/inbox/${c.id}`} className="font-medium text-blush-900 hover:underline">
                      {c.customer_name ?? "Anonymous guest"}
                    </Link>
                    {c.customer_phone && <span className="block text-xs text-blush-800/60">{c.customer_phone}</span>}
                  </td>
                  <td className="capitalize">{c.channel}</td>
                  <td>{c.message_count}</td>
                  <td className="whitespace-nowrap text-blush-800/70">{new Date(c.last_message_at).toLocaleString("en-US")}</td>
                  <td>
                    {c.resolved_at ? (
                      <Badge className="border-green-200 bg-green-50 text-green-700">Resolved</Badge>
                    ) : c.needs_human ? (
                      <Badge className="border-gold-200 bg-gold-50 text-gold-700">Needs a human</Badge>
                    ) : (
                      <Badge className="border-blush-100 bg-blush-50 text-blush-600">AI handled</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
