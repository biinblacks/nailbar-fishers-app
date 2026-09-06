"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import { generateCampaignAssets, type GeneratedAssets } from "@/lib/marketing/generate";
import { TONES } from "@/lib/marketing/tones";
import { checkLimit } from "@/lib/billing/limits";
import { logAudit } from "@/lib/audit";
import { zonedToUtc } from "@/lib/time";
import { friendlyDbError, fromZodError, optionalStr, str, type ActionState } from "@/lib/action-state";

const briefSchema = z.object({
  name: z.string().min(2, "Give the campaign a name").max(80),
  goal: z.string().min(5, "Describe the goal").max(500),
  platforms: z.array(z.enum(["facebook", "instagram", "tiktok", "sms", "email"])).min(1, "Pick at least one platform"),
  tone: z.enum(Object.keys(TONES) as [string, ...string[]]),
  languages: z.array(z.enum(["en", "vi"])).min(1, "Pick at least one language"),
  focus_service_id: z.string().uuid().nullable(),
  promotion_id: z.string().uuid().nullable(),
  brief: z.string().max(1000).nullable(),
});

function assetsToRows(campaignId: string, salonId: string, assets: GeneratedAssets, generation: number) {
  const rows: Array<{ campaign_id: string; salon_id: string; kind: "caption" | "promo" | "hashtags" | "sms" | "email" | "image_prompt" | "video_prompt"; language: string; title: string | null; content: string; generation: number }> = [];
  for (const c of assets.captions) rows.push({ campaign_id: campaignId, salon_id: salonId, kind: "caption", language: c.lang, title: null, content: c.text, generation });
  for (const p of assets.promo) rows.push({ campaign_id: campaignId, salon_id: salonId, kind: "promo", language: p.lang, title: null, content: p.text, generation });
  for (const h of assets.hashtags) rows.push({ campaign_id: campaignId, salon_id: salonId, kind: "hashtags", language: h.lang, title: null, content: h.text, generation });
  for (const s of assets.sms) rows.push({ campaign_id: campaignId, salon_id: salonId, kind: "sms", language: s.lang, title: null, content: s.text, generation });
  for (const e of assets.email) rows.push({ campaign_id: campaignId, salon_id: salonId, kind: "email", language: e.lang, title: e.title, content: e.text, generation });
  if (assets.image_prompt) rows.push({ campaign_id: campaignId, salon_id: salonId, kind: "image_prompt", language: "en", title: null, content: assets.image_prompt, generation });
  if (assets.video_prompt) rows.push({ campaign_id: campaignId, salon_id: salonId, kind: "video_prompt", language: "en", title: null, content: assets.video_prompt, generation });
  return rows;
}

async function loadBriefContext(salonId: string, slug: string, focusServiceId: string | null, promotionId: string | null) {
  const supabase = await createClient();
  const [salonRes, servicesRes, promoRes] = await Promise.all([
    supabase.from("salons").select("name, address, phone, instagram_link").eq("id", salonId).single(),
    supabase.from("services").select("id, name, price_cents, price_label, description").eq("salon_id", salonId).eq("is_active", true).order("display_order"),
    promotionId ? supabase.from("promotions").select("title, description, ends_at").eq("id", promotionId).eq("salon_id", salonId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const services = servicesRes.data ?? [];
  return {
    salon: { ...salonRes.data!, bookingUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/s/${slug}/book`, services },
    focusService: services.find((s) => s.id === focusServiceId) ?? null,
    promotion: promoRes.data ?? null,
  };
}

export async function createCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role, userId } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can create campaigns." };

  const parsed = briefSchema.safeParse({
    name: str(formData, "name"),
    goal: str(formData, "goal"),
    platforms: formData.getAll("platforms").map(String),
    tone: str(formData, "tone") || "warm",
    languages: formData.getAll("languages").map(String),
    focus_service_id: optionalStr(formData, "focus_service_id"),
    promotion_id: optionalStr(formData, "promotion_id"),
    brief: optionalStr(formData, "brief"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const limit = await checkLimit(salon.id, "campaigns");
  if (!limit.allowed) return { error: `Your ${limit.planName} plan includes ${limit.limit} campaigns per month. Upgrade in Billing to create more.` };

  const supabase = await createClient();
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({ salon_id: salon.id, created_by: userId, ...parsed.data, status: "active" })
    .select("id")
    .single();
  if (error) return { error: friendlyDbError(error.message) };

  try {
    const ctx = await loadBriefContext(salon.id, slug, parsed.data.focus_service_id, parsed.data.promotion_id);
    const assets = await generateCampaignAssets(ctx.salon, {
      goal: parsed.data.goal,
      platforms: parsed.data.platforms,
      tone: parsed.data.tone,
      languages: parsed.data.languages,
      focusService: ctx.focusService,
      promotion: ctx.promotion,
      extraNotes: parsed.data.brief,
    });
    const rows = assetsToRows(campaign.id, salon.id, assets, 1);
    if (rows.length) await supabase.from("campaign_assets").insert(rows);
  } catch (err) {
    return { error: `Campaign saved but generation failed: ${err instanceof Error ? err.message : "unknown error"}. Open it and press Regenerate.` };
  }

  await logAudit({ salonId: salon.id, userId, action: "campaign.create", entity: "campaign", entityId: campaign.id, meta: { name: parsed.data.name } });
  revalidatePath(`/app/${slug}/marketing`);
  redirect(`/app/${slug}/marketing/${campaign.id}`);
}

export async function regenerateCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can regenerate." };

  const limit = await checkLimit(salon.id, "campaigns");
  if (!limit.allowed) return { error: `Your ${limit.planName} plan includes ${limit.limit} generations per month. Upgrade in Billing for more.` };

  const supabase = await createClient();
  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", id).eq("salon_id", salon.id).maybeSingle();
  if (!campaign) return { error: "Campaign not found." };
  const { data: last } = await supabase.from("campaign_assets").select("generation").eq("campaign_id", id).order("generation", { ascending: false }).limit(1).maybeSingle();
  const generation = (last?.generation ?? 0) + 1;

  try {
    const ctx = await loadBriefContext(salon.id, slug, campaign.focus_service_id, campaign.promotion_id);
    const assets = await generateCampaignAssets(ctx.salon, {
      goal: campaign.goal,
      platforms: campaign.platforms,
      tone: campaign.tone,
      languages: campaign.languages,
      focusService: ctx.focusService,
      promotion: ctx.promotion,
      extraNotes: campaign.brief,
    });
    const rows = assetsToRows(id, salon.id, assets, generation);
    if (rows.length) await supabase.from("campaign_assets").insert(rows);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Generation failed." };
  }
  revalidatePath(`/app/${slug}/marketing/${id}`);
  return { success: `Generated a fresh set (round ${generation}).` };
}

export async function updateAssetAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const content = str(formData, "content").slice(0, 4000);
  const { salon } = await requireSalonAccess(slug);
  if (!content) return;
  const supabase = await createClient();
  await supabase.from("campaign_assets").update({ content }).eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/marketing`, "layout");
}

export async function toggleFavoriteAssetAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const fav = str(formData, "is_favorite") === "true";
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  await supabase.from("campaign_assets").update({ is_favorite: fav }).eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/marketing`, "layout");
}

export async function archiveCampaignAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  await supabase.from("campaigns").update({ status: "archived" }).eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/marketing`);
  redirect(`/app/${slug}/marketing`);
}

const scheduleSchema = z.object({
  platform: z.enum(["facebook", "instagram", "tiktok", "other"]),
  content: z.string().min(1, "Content is required").max(4000),
  image_url: z.string().url("Enter a full image URL").nullable(),
  link_url: z.string().url("Enter a full URL").nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Pick a time"),
  publish_mode: z.enum(["auto", "manual"]),
});

export async function schedulePostAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const campaignId = optionalStr(formData, "campaign_id");
  const assetId = optionalStr(formData, "asset_id");
  const { salon, userId } = await requireSalonAccess(slug);

  const parsed = scheduleSchema.safeParse({
    platform: str(formData, "platform"),
    content: str(formData, "content"),
    image_url: optionalStr(formData, "image_url"),
    link_url: optionalStr(formData, "link_url"),
    date: str(formData, "date"),
    time: str(formData, "time"),
    publish_mode: str(formData, "publish_mode") || "manual",
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  if (parsed.data.publish_mode === "auto") {
    const { data: meta } = await supabase.from("salon_integrations").select("external_id").eq("salon_id", salon.id).eq("provider", "meta").maybeSingle();
    if (!meta) return { error: "Connect a Facebook Page first (Marketing → Connections) or choose manual posting." };
    if (!["facebook", "instagram"].includes(parsed.data.platform)) return { error: "Auto-publishing works for Facebook and Instagram only." };
  }

  const scheduledFor = zonedToUtc(parsed.data.date, parsed.data.time, salon.timezone);
  const { error } = await supabase.from("scheduled_posts").insert({
    salon_id: salon.id,
    campaign_id: campaignId,
    asset_id: assetId,
    platform: parsed.data.platform,
    content: parsed.data.content,
    image_url: parsed.data.image_url,
    link_url: parsed.data.link_url,
    scheduled_for: scheduledFor.toISOString(),
    publish_mode: parsed.data.publish_mode,
    created_by: userId,
  });
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(`/app/${slug}/marketing`, "layout");
  return { success: `Scheduled for ${parsed.data.date} ${parsed.data.time} (${salon.timezone}).` };
}

export async function updatePostStatusAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const status = str(formData, "status");
  const { salon } = await requireSalonAccess(slug);
  if (!["published", "cancelled"].includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("scheduled_posts")
    .update({ status: status as "published" | "cancelled", ...(status === "published" ? { published_at: new Date().toISOString() } : {}) })
    .eq("id", id)
    .eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/marketing`, "layout");
}

const metaSchema = z.object({
  external_id: z.string().min(3, "Page ID is required").max(64),
  access_token: z.string().min(20, "Paste the Page access token").max(600),
  instagram_account_id: z.string().max(64).nullable(),
  display_name: z.string().max(120).nullable(),
});

export async function connectMetaAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role, userId } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can connect social accounts." };
  const parsed = metaSchema.safeParse({
    external_id: str(formData, "external_id"),
    access_token: str(formData, "access_token"),
    instagram_account_id: optionalStr(formData, "instagram_account_id"),
    display_name: optionalStr(formData, "display_name"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("salon_integrations")
    .upsert({ salon_id: salon.id, provider: "meta", connected_by: userId, ...parsed.data }, { onConflict: "salon_id,provider" });
  if (error) return { error: friendlyDbError(error.message) };
  await logAudit({ salonId: salon.id, userId, action: "integration.connect", entity: "meta", entityId: parsed.data.external_id });
  revalidatePath(`/app/${slug}/marketing`);
  return { success: "Facebook Page connected. Auto-publishing is available." };
}

export async function disconnectMetaAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const { salon, role, userId } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return;
  const supabase = await createClient();
  await supabase.from("salon_integrations").delete().eq("salon_id", salon.id).eq("provider", "meta");
  await logAudit({ salonId: salon.id, userId, action: "integration.disconnect", entity: "meta" });
  revalidatePath(`/app/${slug}/marketing`);
}
