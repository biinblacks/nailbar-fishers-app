import { type NextRequest } from "next/server";
import { generateReceptionistReply } from "@/lib/ai/receptionist";
import {
  adminDb,
  forwardNumberFor,
  languageFor,
  maxTurnsFor,
  recordTurn,
  salonForCalledNumber,
  voiceEnabled,
} from "@/lib/voice/call";
import { gatherSpeech, sayAndHangup, transfer } from "@/lib/voice/twiml";
import { callbackUrl, verifiedForm, xml } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Twilio heard nothing this turn (actionOnEmptyResult sends an empty result). */
const NUDGE = {
  en: "Sorry, I didn't catch that. Could you say it again?",
  vi: "Xin lỗi, tôi chưa nghe rõ. Bạn nói lại giúp tôi nhé?",
} as const;

const GOODBYE = {
  en: "Thanks for calling. Have a lovely day!",
  vi: "Cảm ơn bạn đã gọi. Chúc bạn một ngày vui vẻ!",
} as const;

const CONNECTING = {
  en: "Let me get someone for you. One moment.",
  vi: "Để tôi nối máy cho nhân viên. Bạn chờ một chút nhé.",
} as const;

const NO_HUMAN = {
  en: "I'm sorry, nobody is free right now. Please call back during business hours.",
  vi: "Xin lỗi, hiện chưa có ai trống. Bạn vui lòng gọi lại trong giờ làm việc nhé.",
} as const;

const TROUBLE = {
  en: "Sorry, I'm having trouble right now.",
  vi: "Xin lỗi, hệ thống đang gặp trục trặc.",
} as const;

/** Caller said goodbye — end the call instead of asking another question. */
const FAREWELLS = [
  "goodbye", "bye", "that's all", "thats all", "nothing else", "no thanks", "no thank you",
  "we're good", "were good", "that's it", "thats it",
  "tạm biệt", "chào bạn nhé", "hết rồi", "không cần nữa", "vậy thôi", "cảm ơn nhé",
];

function isFarewell(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (t.length > 40) return false; // a long sentence that merely contains "bye" is not a farewell
  return FAREWELLS.some((f) => t.includes(f));
}

/**
 * One turn of the conversation: Twilio posts what the caller said, we answer
 * and listen again.
 *
 * The AI itself does the real work — `generateReceptionistReply` already knows
 * the menu, checks availability and can create the booking. This route only
 * decides whether to keep listening, transfer, or hang up.
 */
export async function POST(request: NextRequest) {
  const parsed = await verifiedForm(request);
  if (!parsed.ok) return parsed.response;
  const { params } = parsed;

  const callSid = params.CallSid ?? "";
  const to = params.To ?? "";
  const spoken = (params.SpeechResult ?? "").trim();
  if (!callSid || !to) return xml(sayAndHangup(TROUBLE.en, "en"));

  const db = adminDb();
  const salon = await salonForCalledNumber(db, to);
  if (!salon || !voiceEnabled(salon)) return xml(sayAndHangup(TROUBLE.en, "en"));

  const language = languageFor(salon);
  const forward = forwardNumberFor(salon);
  const action = callbackUrl(request, "/api/webhooks/twilio/voice/turn");

  const toHuman = () =>
    forward
      ? xml(transfer(CONNECTING[language], forward, language, to))
      : xml(sayAndHangup(NO_HUMAN[language], language));

  // Silence: re-prompt once, then stop wasting the caller's time.
  //
  // The count of *consecutive* silences rides in the action URL rather than the
  // call log, which counts every turn: without it, one silence late in a long
  // call would transfer immediately instead of nudging first.
  if (!spoken) {
    const silences = Number(new URL(request.url).searchParams.get("silent") ?? "0");
    if (silences >= 1) return toHuman();
    return xml(gatherSpeech({ action: `${action}?silent=${silences + 1}`, language, prompt: NUDGE[language] }));
  }

  if (isFarewell(spoken)) {
    await recordTurn(db, callSid, {});
    return xml(sayAndHangup(GOODBYE[language], language));
  }

  const turns = await recordTurn(db, callSid, {});
  if (turns > maxTurnsFor(salon)) return toHuman();

  try {
    // The CallSid is the session id, so every turn of one call lands on one
    // conversation and the AI keeps its context across the call.
    const reply = await generateReceptionistReply(salon, callSid, spoken.slice(0, 1000), "voice", process.env.NEXT_PUBLIC_SITE_URL);

    await recordTurn(db, callSid, {
      appointmentId: reply.booking?.id,
      outcome: reply.booking ? "booked" : reply.needsHuman ? "handoff" : "answered",
    });

    if (reply.needsHuman) return toHuman();
    return xml(gatherSpeech({ action, language, prompt: reply.reply }));
  } catch (err) {
    console.error("[voice] reply failed", err);
    // A failed turn must not drop the customer: hand them to a person.
    return toHuman();
  }
}
