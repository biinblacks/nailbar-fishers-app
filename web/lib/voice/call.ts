import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicSalon, type PublicSalon } from "@/lib/storefront";
import { isVoiceLanguage, type VoiceLanguage } from "./twiml";

export type Db = SupabaseClient<Database>;

/** Everything a call turn needs, resolved once from the Twilio payload. */
export interface CallContext {
  salon: PublicSalon;
  language: VoiceLanguage;
  /** chat_conversations session id — the CallSid, so turns group per call. */
  sessionId: string;
}

/**
 * Which salon owns the number the guest dialled.
 *
 * Falls back to sms_number so a salon running voice and texts on one Twilio
 * number only has to fill in a single field.
 */
export async function salonForCalledNumber(db: Db, to: string): Promise<PublicSalon | null> {
  const { data } = await db
    .from("salons")
    .select("slug")
    .or(`voice_number.eq.${to},sms_number.eq.${to}`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!data?.slug) return null;
  return getPublicSalon(data.slug as string);
}

export function languageFor(salon: PublicSalon): VoiceLanguage {
  return isVoiceLanguage(salon.voice_language) ? salon.voice_language : "en";
}

/** Number a "get me a person" transfer rings. Null means no human to reach. */
export function forwardNumberFor(salon: PublicSalon): string | null {
  const forward = salon.voice_forward_number?.trim();
  if (forward) return forward;
  const fallback = salon.phone?.trim();
  return fallback ? fallback : null;
}

export function greetingFor(salon: PublicSalon, language: VoiceLanguage): string {
  const custom = salon.voice_greeting?.trim();
  if (custom) return custom;
  return language === "vi"
    ? `Cảm ơn bạn đã gọi ${salon.name}. Tôi là trợ lý ảo. Bạn cần giúp gì ạ?`
    : `Thanks for calling ${salon.name}. I'm the virtual receptionist. How can I help you today?`;
}

export function maxTurnsFor(salon: PublicSalon): number {
  const n = Number(salon.voice_max_turns);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 20;
}

/** True when the salon has opted in AND the platform can actually answer. */
export function voiceEnabled(salon: PublicSalon): boolean {
  return salon.voice_ai_enabled && salon.ai_enabled;
}

// ---------------------------------------------------------------------------
// Call log
// ---------------------------------------------------------------------------

export async function startCallLog(
  db: Db,
  params: { salonId: string; callSid: string; from: string | null; to: string | null; language: VoiceLanguage }
): Promise<void> {
  // A Twilio retry replays the same CallSid; upsert keeps one row per call.
  const { error } = await db.from("call_logs").upsert(
    {
      salon_id: params.salonId,
      call_sid: params.callSid,
      from_number: params.from,
      to_number: params.to,
      language: params.language,
      status: "in_progress",
    },
    { onConflict: "call_sid" }
  );
  if (error) console.error("[voice] failed to open call log", error.message);
}

export async function recordTurn(
  db: Db,
  callSid: string,
  patch: { conversationId?: string; appointmentId?: string; outcome?: "answered" | "booked" | "handoff" }
): Promise<number> {
  const { data } = await db.from("call_logs").select("turn_count, outcome").eq("call_sid", callSid).maybeSingle();
  const turns = Number(data?.turn_count ?? 0) + 1;
  // "booked" and "handoff" are terminal facts about the call: a later plain
  // answer must not downgrade them back to "answered".
  const sticky = data?.outcome === "booked" || data?.outcome === "handoff";
  await db
    .from("call_logs")
    .update({
      turn_count: turns,
      ...(patch.conversationId ? { conversation_id: patch.conversationId } : {}),
      ...(patch.appointmentId ? { appointment_id: patch.appointmentId } : {}),
      ...(patch.outcome && !sticky ? { outcome: patch.outcome } : {}),
    })
    .eq("call_sid", callSid);
  return turns;
}

export async function finishCallLog(
  db: Db,
  callSid: string,
  patch: { status: "completed" | "forwarded" | "failed" | "no_answer"; durationSeconds?: number | null; forwardedTo?: string | null; error?: string | null }
): Promise<void> {
  await db
    .from("call_logs")
    .update({
      status: patch.status,
      ended_at: new Date().toISOString(),
      ...(patch.durationSeconds != null ? { duration_seconds: patch.durationSeconds } : {}),
      ...(patch.forwardedTo ? { forwarded_to: patch.forwardedTo } : {}),
      ...(patch.error ? { error: patch.error.slice(0, 500) } : {}),
    })
    .eq("call_sid", callSid);
}

export async function loadCallLog(db: Db, callSid: string) {
  const { data } = await db
    .from("call_logs")
    .select("id, salon_id, conversation_id, appointment_id, outcome, turn_count, from_number, language")
    .eq("call_sid", callSid)
    .maybeSingle();
  return data;
}

export function adminDb(): Db {
  return createAdminClient();
}
