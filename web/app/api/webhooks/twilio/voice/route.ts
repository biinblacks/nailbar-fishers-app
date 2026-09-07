import { type NextRequest } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { checkLimit } from "@/lib/billing/limits";
import {
  adminDb,
  forwardNumberFor,
  greetingFor,
  languageFor,
  salonForCalledNumber,
  startCallLog,
  voiceEnabled,
} from "@/lib/voice/call";
import { gatherSpeech, sayAndHangup, transfer } from "@/lib/voice/twiml";
import { callbackUrl, verifiedForm, xml } from "./shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A guest dialled the salon's Twilio number.
 *
 * Greet them and open the first <Gather>; from here the conversation loops
 * through /turn. Whenever the AI cannot take the call — switched off, no AI
 * key, plan exhausted — fall back to ringing a human rather than hanging up on
 * a paying customer.
 */
export async function POST(request: NextRequest) {
  const parsed = await verifiedForm(request);
  if (!parsed.ok) return parsed.response;
  const { params } = parsed;

  const to = params.To ?? "";
  const from = params.From ?? "";
  const callSid = params.CallSid ?? "";
  if (!to || !callSid) return xml(sayAndHangup("Sorry, we could not take your call.", "en"));

  const db = adminDb();
  const salon = await salonForCalledNumber(db, to);
  if (!salon) {
    console.warn(`[voice] no salon owns ${to}`);
    return xml(sayAndHangup("Sorry, this number is not in service.", "en"));
  }

  const language = languageFor(salon);
  const forward = forwardNumberFor(salon);

  function bail(reason: string) {
    console.warn(`[voice] ${salon!.slug}: ${reason}`);
    if (forward) {
      const line = language === "vi" ? "Vui lòng chờ trong giây lát, tôi nối máy cho bạn." : "One moment please, connecting you now.";
      return xml(transfer(line, forward, language, to));
    }
    const line =
      language === "vi"
        ? "Xin lỗi, hiện chúng tôi không nghe máy được. Bạn vui lòng gọi lại sau nhé."
        : "Sorry, we cannot take your call right now. Please try again later.";
    return xml(sayAndHangup(line, language));
  }

  if (!voiceEnabled(salon)) return bail("voice AI disabled");
  if (!isAiConfigured()) return bail("no AI provider configured");

  const quota = await checkLimit(salon.id, "ai_messages");
  if (!quota.allowed) return bail(`AI quota exhausted (${quota.used}/${quota.limit})`);

  await startCallLog(db, { salonId: salon.id, callSid, from: from || null, to, language });

  return xml(
    gatherSpeech({
      action: callbackUrl(request, "/api/webhooks/twilio/voice/turn"),
      language,
      prompt: greetingFor(salon, language),
    })
  );
}
