import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicUrlFor, verifyTwilioSignature } from "@/lib/webhooks/verify";
import { routeInboundSms } from "@/lib/inbox/sms";
import { generateReceptionistReply } from "@/lib/ai/receptionist";
import { getPublicSalon } from "@/lib/storefront";
import { isAiConfigured } from "@/lib/ai";
import { checkLimit } from "@/lib/billing/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function twiml(message?: string): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, { status: 200, headers: { "Content-Type": "text/xml" } });
}

/**
 * Inbound SMS from a guest. Lands in the salon inbox flagged for a human;
 * when the salon turned on SMS auto-reply the AI receptionist answers too.
 */
export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return NextResponse.json({ error: "Twilio not configured" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  if (!verifyTwilioSignature(publicUrlFor(request), params, request.headers.get("x-twilio-signature"), authToken)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const body = (params.Body ?? "").trim();
  if (!params.From || !params.To || !body) return twiml();

  const db = createAdminClient();
  const routed = await routeInboundSms(db, { from: params.From, to: params.To, body: body.slice(0, 2000), messageSid: params.MessageSid ?? params.SmsSid ?? "" });
  if (!routed) {
    console.warn(`[inbound sms] no salon owns ${params.To}`);
    return twiml();
  }

  if (!routed.salon.sms_ai_autoreply || !routed.salon.ai_enabled || !isAiConfigured()) return twiml();

  const quota = await checkLimit(routed.salon.id, "ai_messages");
  if (!quota.allowed) return twiml();

  try {
    const salon = await getPublicSalon(routed.salon.slug);
    if (!salon) return twiml();
    // The receptionist persists both turns itself; the guest's message was
    // already logged above, so ask it to answer the same text on this thread.
    const reply = await generateReceptionistReply(salon, routed.sessionId, body, "web", process.env.NEXT_PUBLIC_SITE_URL);
    return twiml(reply.reply.slice(0, 1500));
  } catch (err) {
    console.error("[inbound sms] AI reply failed", err);
    return twiml();
  }
}
