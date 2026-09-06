import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { CampaignBriefForm } from "@/components/forms/CampaignBriefForm";

export const metadata: Metadata = { title: "New campaign" };

export default async function NewCampaignPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const [servicesRes, promosRes] = await Promise.all([
    supabase.from("services").select("id, name").eq("salon_id", salon.id).eq("is_active", true).order("display_order"),
    supabase.from("promotions").select("id, title").eq("salon_id", salon.id).eq("is_active", true),
  ]);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="AI marketing" title="New campaign" description="Tell the AI what you want; it writes captions, a promo, hashtags, an SMS, an email, and image/video prompts." />
      <Card>
        <CampaignBriefForm slug={slug} services={servicesRes.data ?? []} promotions={promosRes.data ?? []} />
      </Card>
    </div>
  );
}
