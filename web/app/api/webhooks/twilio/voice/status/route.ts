import { NextResponse, type NextRequest } from "next/server";
import { adminDb, finishCallLog, loadCallLog, salonForCalledNumber } from "@/lib/voice/call";
import { sendSms } from "@/lib/messaging/providers";
import { emptyTwiml } from "@/lib/voice/twiml";
import { verifiedForm, xml } from "../shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLLOW_UP = {
  booked: {
    en: (salon: string) => `${salon}: your appointment is confirmed. See you soon!`,
    vi: (salon: string) => `${salon}: lịch hẹn của bạn đã được xác nhận. Hẹn gặp bạn!`,
  },
  answered: {
    en: (salon: string, link: string) => `Thanks for calling ${salon}. Book anytime here: ${link}`,
    vi: (salon: string, link: string) => `Cảm ơn bạn đã gọi ${salon}. Đặt lịch bất cứ lúc nào tại: ${link}`,
  },
} as const;

/**
 * Twilio's end-of-call callback: close the log, and text the caller a recap
 * when the salon asked for it.
 *
 * Twilio ignores the body of a status callback, so this returns empty TwiML
 * purely to keep the response shape consistent with the other voice routes.
 */
export async function POST(request: NextRequest) {
  const parsed = await verifiedForm(request);
  if (!parsed.ok) return parsed.response;
  const { params } = parsed;

  const callSid = params.CallSid ?? "";
  if (!callSid) return xml(emptyTwiml());

  const db = adminDb();
  const log = await loadCallLog(db, callSid);
  if (!log) return xml(emptyTwiml());

  const twilioStatus = params.CallStatus ?? "";
  const status =
    twilioStatus === "completed" ? "completed" : twilioStatus === "no-answer" ? "no_answer" : twilioStatus === "failed" ? "failed" : "completed";
  const duration = Number(params.CallDuration ?? "");

  await finishCallLog(db, callSid, {
    status: log.outcome === "handoff" ? "forwarded" : status,
    durationSeconds: Number.isFinite(duration) ? duration : null,
  });

  await maybeTextCaller(db, params.To ?? "", log);
  return xml(emptyTwiml());
}

type CallLog = NonNullable<Awaited<ReturnType<typeof loadCallLog>>>;

async function maybeTextCaller(db: ReturnType<typeof adminDb>, to: string, log: CallLog): Promise<void> {
  const from = log.from_number;
  if (!from || !to) return;
  // Only worth a text when the AI actually helped; a transfer means a person
  // is already talking to them.
  if (log.outcome !== "booked" && log.outcome !== "answered") return;

  const salon = await salonForCalledNumber(db, to);
  if (!salon) return;
  if (!salon.voice_sms_followup) return;

  const language = log.language === "vi" ? "vi" : "en";
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const body =
    log.outcome === "booked"
      ? FOLLOW_UP.booked[language](salon.name)
      : FOLLOW_UP.answered[language](salon.name, `${site}/s/${salon.slug}/book`);

  try {
    const sent = await sendSms(from, body, salon.sms_number ?? salon.voice_number);
    await db.from("message_log").insert({
      salon_id: salon.id,
      channel: "sms",
      recipient: from,
      body,
      provider: sent.provider,
      provider_message_id: sent.providerMessageId,
      status: "sent",
      direction: "outbound",
    });
  } catch (err) {
    // A missing Twilio SMS setup must never fail the call teardown.
    console.warn("[voice] follow-up SMS skipped", err instanceof Error ? err.message : err);
  }
}

export function GET() {
  return NextResponse.json({ error: "POST only" }, { status: 405 });
}
