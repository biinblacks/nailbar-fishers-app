import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { isTranscriptionAvailable } from "@/lib/interpreter/transcribe";
import { PageHeader } from "@/components/ui/PageHeader";
import { InterpreterConsole, type QuickPhrase } from "@/components/interpreter/InterpreterConsole";

export const metadata: Metadata = { title: "Bee Interpreter" };
export const dynamic = "force-dynamic";

export default async function InterpreterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data } = await supabase
    .from("quick_phrases")
    .select("id, category, text_en, text_vi, salon_id, display_order")
    .or(`salon_id.is.null,salon_id.eq.${salon.id}`)
    .eq("is_active", true)
    .order("category")
    .order("display_order");

  // Salon-specific phrases first inside each category.
  const phrases = ((data ?? []) as Array<QuickPhrase & { display_order: number }>).sort((a, b) =>
    a.category === b.category ? Number(!!b.salon_id) - Number(!!a.salon_id) || a.display_order - b.display_order : 0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Bee Interpreter"
        title="Live interpreter"
        description="Vietnamese ⇄ English (and more) between the technician and the guest. Tap a mic or type; the other side hears the translation."
        actions={
          <Link href={`/app/${slug}/interpreter/history`} className="btn-secondary">
            Saved conversations
          </Link>
        }
      />
      <InterpreterConsole slug={slug} phrases={phrases} serverTranscription={isTranscriptionAvailable()} />
    </div>
  );
}
