import "server-only";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai";
import { formatPrice } from "@/lib/format";
import { TONES } from "./tones";

export interface CampaignBrief {
  goal: string;
  platforms: string[];
  tone: string;
  languages: string[]; // subset of en, vi
  focusService?: { name: string; price_cents: number; price_label: string | null; description: string | null } | null;
  promotion?: { title: string; description: string; ends_at: string | null } | null;
  extraNotes?: string | null;
}

export interface SalonMarketingContext {
  name: string;
  address: string | null;
  phone: string | null;
  instagram_link: string | null;
  bookingUrl: string;
  services: Array<{ name: string; price_cents: number; price_label: string | null }>;
}

const localized = z.array(z.object({ lang: z.enum(["en", "vi"]), text: z.string().min(1) }));
const outputSchema = z.object({
  captions: localized.default([]),
  promo: localized.default([]),
  hashtags: localized.default([]),
  sms: localized.default([]),
  email: z.array(z.object({ lang: z.enum(["en", "vi"]), title: z.string().min(1), text: z.string().min(1) })).default([]),
  image_prompt: z.string().default(""),
  video_prompt: z.string().default(""),
});
export type GeneratedAssets = z.infer<typeof outputSchema>;

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  return start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
}

/**
 * Generates a full content pack for one campaign. The model returns strict
 * JSON so every asset can be stored and edited separately.
 */
export async function generateCampaignAssets(salon: SalonMarketingContext, brief: CampaignBrief): Promise<GeneratedAssets> {
  const langs = brief.languages.filter((l) => l === "en" || l === "vi");
  const menu = salon.services.slice(0, 20).map((s) => `- ${s.name}: ${formatPrice(s.price_cents, s.price_label)}`).join("\n");
  const focus = brief.focusService
    ? `Featured service: ${brief.focusService.name} (${formatPrice(brief.focusService.price_cents, brief.focusService.price_label)})${brief.focusService.description ? ` — ${brief.focusService.description}` : ""}`
    : "No single featured service; promote the salon overall.";
  const promo = brief.promotion
    ? `Promotion to push: ${brief.promotion.title} — ${brief.promotion.description}${brief.promotion.ends_at ? ` (ends ${brief.promotion.ends_at})` : ""}`
    : "No specific promotion.";

  const system = `You are a social media marketer for independent nail salons in the US. You write short, scroll-stopping, genuine copy that sounds like the salon owner, never like a corporation. Never invent prices, hours, or offers that are not provided. Output ONLY valid JSON matching the schema — no prose, no markdown fences.`;

  const message = `SALON
Name: ${salon.name}
Address: ${salon.address ?? "n/a"}
Phone: ${salon.phone ?? "n/a"}
Instagram: ${salon.instagram_link ?? "n/a"}
Booking link: ${salon.bookingUrl}
Menu:
${menu || "- (menu not set)"}

CAMPAIGN
Goal: ${brief.goal}
Platforms: ${brief.platforms.join(", ")}
Tone: ${TONES[brief.tone] ?? brief.tone}
Languages: ${langs.join(", ")} (write every localized item once per language; Vietnamese must be natural Vietnamese as spoken by the Vietnamese-American nail community, not a literal translation)
${focus}
${promo}
${brief.extraNotes ? `Extra notes from the owner: ${brief.extraNotes}` : ""}

Return JSON with exactly this shape:
{
  "captions": [{"lang": "en"|"vi", "text": "..."}],      // 3 per language, each 1-3 short lines, ready to paste; include a call to action with the booking link or phone
  "promo": [{"lang": "en"|"vi", "text": "..."}],         // 1 per language: promotion announcement copy (or a seasonal offer suggestion if no promotion)
  "hashtags": [{"lang": "en"|"vi", "text": "..."}],      // 1 per language: 12-18 hashtags on one line, local + niche (nail terms, city)
  "sms": [{"lang": "en"|"vi", "text": "..."}],           // 1 per language: <= 160 characters, for a text blast, includes booking link
  "email": [{"lang": "en"|"vi", "title": "...", "text": "..."}], // 1 per language: subject line + 80-120 word email body
  "image_prompt": "...",   // English prompt for an image generator: a photo-real nail close-up matching the campaign, lighting, colors, props, no text in image
  "video_prompt": "..."    // English prompt for a 10-15 s vertical video (Reels/TikTok): shot list with 3-4 beats, on-screen text ideas, music mood
}`;

  const result = await getAiProvider().run({
    system,
    history: [],
    message,
    tools: [],
    execute: async () => ({}),
    maxToolRounds: 0,
    maxTokens: 3500,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(result.reply));
  } catch {
    throw new Error("The model did not return valid JSON. Please try again.");
  }
  const validated = outputSchema.safeParse(parsed);
  if (!validated.success) throw new Error("The generated content had an unexpected shape. Please try again.");
  return validated.data;
}
