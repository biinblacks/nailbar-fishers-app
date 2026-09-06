import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import { localParts } from "@/lib/time";
import { archiveCampaignAction, toggleFavoriteAssetAction } from "@/actions/marketing";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/forms/ConfirmButton";
import { CopyButton, EditableAsset, RegenerateForm, SchedulePostForm } from "@/components/forms/MarketingForms";

export const metadata: Metadata = { title: "Campaign" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  caption: "Social captions",
  promo: "Promotion copy",
  hashtags: "Hashtags",
  sms: "SMS blast",
  email: "Email",
  image_prompt: "Image prompt",
  video_prompt: "Video prompt",
};
const KIND_ORDER = ["caption", "promo", "hashtags", "sms", "email", "image_prompt", "video_prompt"];

export default async function CampaignPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { salon, role } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const canEdit = canManageSalon(role);

  const [campaignRes, assetsRes, metaRes] = await Promise.all([
    supabase.from("campaigns").select("*").eq("id", id).eq("salon_id", salon.id).maybeSingle(),
    supabase.from("campaign_assets").select("*").eq("campaign_id", id).order("generation", { ascending: false }).order("created_at"),
    supabase.from("salon_integrations").select("external_id").eq("salon_id", salon.id).eq("provider", "meta").maybeSingle(),
  ]);
  if (!campaignRes.data) notFound();
  const campaign = campaignRes.data;
  const assets = assetsRes.data ?? [];
  const latestGen = assets[0]?.generation ?? 0;
  const latest = assets.filter((a) => a.generation === latestGen);
  const older = assets.filter((a) => a.generation !== latestGen && a.is_favorite);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI marketing"
        title={campaign.name}
        description={`${campaign.goal} · ${campaign.platforms.join(", ")} · ${campaign.tone}`}
        actions={
          canEdit ? (
            <>
              <RegenerateForm slug={slug} id={id} />
              <ConfirmButton action={archiveCampaignAction} hidden={{ slug, id }} confirmText="Archive this campaign?" variant="secondary">
                Archive
              </ConfirmButton>
            </>
          ) : undefined
        }
      />

      {latest.length === 0 && <p className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-800">No content yet. Press Regenerate to create the first pack.</p>}

      {KIND_ORDER.map((kind) => {
        const items = latest.filter((a) => a.kind === kind);
        if (items.length === 0) return null;
        return (
          <Card key={kind}>
            <h2 className="text-lg font-semibold text-blush-900">{KIND_LABEL[kind]}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {items.map((a) => (
                <div key={a.id} className={`rounded-2xl border p-4 ${a.is_favorite ? "border-gold-300 bg-gold-50/40" : "border-blush-100 bg-white"}`}>
                  <div className="flex items-center justify-between text-xs text-blush-800/60">
                    <span className="uppercase">{a.language}{a.title ? ` · ${a.title}` : ""}</span>
                    <span className="flex items-center gap-3">
                      <CopyButton text={a.title ? `${a.title}\n\n${a.content}` : a.content} />
                      <form action={toggleFavoriteAssetAction}>
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="is_favorite" value={a.is_favorite ? "false" : "true"} />
                        <button type="submit" className="text-xs font-medium text-gold-600 hover:underline" aria-label={a.is_favorite ? "Remove favorite" : "Mark favorite"}>
                          {a.is_favorite ? "★ Favorite" : "☆ Favorite"}
                        </button>
                      </form>
                    </span>
                  </div>
                  <div className="mt-2">
                    <EditableAsset slug={slug} id={a.id} content={a.content} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {older.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-blush-900">Favorites from earlier rounds</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {older.map((a) => (
              <li key={a.id} className="rounded-2xl border border-blush-50 px-4 py-2">
                <span className="text-xs uppercase text-blush-800/60">{KIND_LABEL[a.kind]} · {a.language} · round {a.generation}</span>
                <p className="mt-1 whitespace-pre-wrap text-blush-900">{a.content}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Schedule a post</h2>
        <p className="mt-1 text-xs text-blush-800/60">Times are in {salon.timezone}. Auto-publishing needs a connected Facebook Page (Marketing → Connections).</p>
        <div className="mt-4">
          <SchedulePostForm
            slug={slug}
            campaignId={id}
            assets={latest.filter((a) => ["caption", "promo"].includes(a.kind)).map((a) => ({ id: a.id, kind: a.kind, language: a.language, content: a.content }))}
            metaConnected={!!metaRes.data}
            defaultDate={localParts(new Date(), salon.timezone).date}
          />
        </div>
      </Card>
    </div>
  );
}
