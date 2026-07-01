import { supabase } from "../config/supabase.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function formatTime(time: string | null): string {
  if (!time) return "Closed";
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = minuteStr ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute} ${period}`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

// Builds a single system-prompt string from all knowledge-base tables in
// Supabase. Called fresh on every chat request so admin edits take effect
// immediately without redeploying the server.
export async function buildKnowledgeBaseContext(): Promise<string> {
  const [
    profileRes,
    hoursRes,
    servicesRes,
    staffRes,
    policiesRes,
    faqsRes,
    promosRes,
    knowledgeRes,
  ] = await Promise.all([
    supabase.from("salon_profile").select("*").limit(1).maybeSingle(),
    supabase.from("business_hours").select("*").order("day_of_week"),
    supabase
      .from("services")
      .select("name, description, price_cents, price_label, duration_minutes")
      .eq("is_active", true)
      .order("display_order"),
    supabase
      .from("staff")
      .select("full_name, title, bio")
      .eq("is_active", true)
      .order("display_order"),
    supabase.from("salon_policies").select("title, content").order("display_order"),
    supabase.from("faqs").select("question, answer").eq("is_active", true).order("display_order"),
    supabase
      .from("promotions")
      .select("title, description, ends_at")
      .eq("is_active", true),
    supabase.from("ai_knowledge").select("topic, content").eq("is_active", true),
  ]);

  const profile = profileRes.data;
  const hours = hoursRes.data ?? [];
  const services = servicesRes.data ?? [];
  const staff = staffRes.data ?? [];
  const policies = policiesRes.data ?? [];
  const faqs = faqsRes.data ?? [];
  const promos = promosRes.data ?? [];
  const knowledge = knowledgeRes.data ?? [];

  const hoursText = hours
    .map((h) => `${DAY_NAMES[h.day_of_week]}: ${h.is_closed ? "Closed" : `${formatTime(h.open_time)} - ${formatTime(h.close_time)}`}`)
    .join("\n");

  const servicesText = services
    .map((s) => {
      const price = s.price_label ?? formatPrice(s.price_cents);
      return `- ${s.name}: ${price} (${s.duration_minutes} min)${s.description ? ` — ${s.description}` : ""}`;
    })
    .join("\n");

  const staffText = staff
    .map((s) => `- ${s.full_name}, ${s.title ?? "Nail Technician"}${s.bio ? `: ${s.bio}` : ""}`)
    .join("\n");

  const policiesText = policies.map((p) => `- ${p.title}: ${p.content}`).join("\n");
  const faqsText = faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
  const promosText = promos
    .map((p) => `- ${p.title}: ${p.description}${p.ends_at ? ` (valid until ${p.ends_at})` : ""}`)
    .join("\n");
  const knowledgeText = knowledge.map((k) => `${k.topic}: ${k.content}`).join("\n");

  return `
SALON PROFILE
Name: ${profile?.name ?? "Nail Bar"}
Address: ${profile?.address ?? "unknown"}
Phone: ${profile?.phone ?? "unknown"}
Email: ${profile?.email ?? "unknown"}
Parking: ${profile?.parking_info ?? "unknown"}
Google Review Link: ${profile?.google_review_link ?? "unknown"}
Google Map Link: ${profile?.google_map_link ?? "unknown"}

BUSINESS HOURS
${hoursText || "unknown"}

SERVICES & PRICING
${servicesText || "unknown"}

TECHNICIANS
${staffText || "unknown"}

POLICIES
${policiesText || "unknown"}

CURRENT PROMOTIONS
${promosText || "None currently."}

FREQUENTLY ASKED QUESTIONS
${faqsText || "None."}

ADDITIONAL GUIDANCE
${knowledgeText || "None."}
`.trim();
}
