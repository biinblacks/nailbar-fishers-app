import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { deletePhraseAction } from "@/actions/interpreter";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { PhraseForm } from "@/components/forms/PhraseForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Quick phrases" };

export default async function PhrasesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const [ownRes, globalRes] = await Promise.all([
    supabase.from("quick_phrases").select("*").eq("salon_id", salon.id).order("category").order("display_order"),
    supabase.from("quick_phrases").select("id, category, text_en, text_vi").is("salon_id", null).order("category").order("display_order"),
  ]);
  const own = ownRes.data ?? [];
  const global = globalRes.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Bee Interpreter"
        title="Quick phrases"
        description="One-tap phrases for the interpreter. Your own phrases appear first; the built-in set covers the usual salon flow."
        actions={<LinkButton href={`/app/${slug}/interpreter`} variant="secondary">Back to interpreter</LinkButton>}
      />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-blush-900">Your phrases</h2>
            <p className="mt-1 text-xs text-blush-800/60">Use %s where a number goes, e.g. &quot;That will be about $%s.&quot;</p>
          </div>
          <PhraseForm slug={slug} collapsible />
        </div>
        <div className="mt-5 space-y-3">
          {own.length === 0 && <p className="text-sm text-blush-800/60">No custom phrases yet.</p>}
          {own.map((p) => (
            <details key={p.id} className="rounded-2xl border border-blush-50 bg-blush-50/40">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-blush-800/60">{p.category}</span>
                  <span className="font-medium text-blush-900">{p.text_en}</span>
                  <span className="block text-xs text-blush-800/60">{p.text_vi}</span>
                </span>
                <span className="text-xs text-blush-500">Edit</span>
              </summary>
              <div className="space-y-3 px-4 pb-4">
                <PhraseForm slug={slug} phrase={p} />
                <ConfirmButton action={deletePhraseAction} hidden={{ slug, id: p.id }} confirmText="Delete this phrase?" className="!px-4 !py-1.5 text-xs">
                  Delete
                </ConfirmButton>
              </div>
            </details>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Built-in phrases</h2>
        <p className="mt-1 text-xs text-blush-800/60">Shared by every salon. Add your own version above to override the wording.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {global.map((p) => (
            <div key={p.id} className="rounded-2xl border border-blush-50 px-4 py-2 text-sm">
              <span className="mr-2 rounded-full bg-blush-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-blush-800/60">{p.category}</span>
              <span className="text-blush-900">{p.text_en}</span>
              <span className="block text-xs text-blush-800/60">{p.text_vi}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
