import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { languageByCode } from "@/lib/interpreter/languages";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Interpreter history" };

export default async function InterpreterHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("interpreter_sessions")
    .select("id, title, lang_a, lang_b, turn_count, started_at, ended_at, customers(full_name)")
    .eq("salon_id", salon.id)
    .order("started_at", { ascending: false })
    .limit(100);
  const sessions = data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Bee Interpreter"
        title="Saved conversations"
        description="Every interpreted conversation is kept here so you can review what was agreed with a guest."
        actions={<LinkButton href={`/app/${slug}/interpreter`}>Open interpreter</LinkButton>}
      />
      {sessions.length === 0 ? (
        <EmptyState title="No conversations yet" description="Conversations are saved automatically as you interpret." />
      ) : (
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Conversation</th>
                <th>Guest</th>
                <th>Languages</th>
                <th>Turns</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/app/${slug}/interpreter/history/${s.id}`} className="font-medium text-blush-900 hover:underline">
                      {s.title ?? "Untitled conversation"}
                    </Link>
                    {!s.ended_at && <span className="ml-2 text-xs text-gold-600">in progress</span>}
                  </td>
                  <td>{s.customers?.full_name ?? "—"}</td>
                  <td className="whitespace-nowrap">
                    {languageByCode(s.lang_a).nativeName} ⇄ {languageByCode(s.lang_b).nativeName}
                  </td>
                  <td>{s.turn_count}</td>
                  <td className="whitespace-nowrap text-blush-800/70">{new Date(s.started_at).toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
