import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicUrlFor, verifyTwilioSignature } from "@/lib/webhooks/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DELIVERED = new Set(["delivered", "read"]);
const FAILED = new Set(["failed", "undelivered"]);

/**
 * Twilio status callback: updates message_log with the carrier's verdict so
 * the Automations page can show what actually reached the guest.
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

  const sid = params.MessageSid || params.SmsSid;
  const status = params.MessageStatus || params.SmsStatus;
  if (!sid || !status) return NextResponse.json({ received: true });

  const now = new Date().toISOString();
  await createAdminClient()
    .from("message_log")
    .update({
      provider_status: status,
      ...(DELIVERED.has(status) ? { status: "delivered", delivered_at: now } : {}),
      ...(FAILED.has(status) ? { status: "failed", failed_at: now, error: params.ErrorMessage || `Twilio ${params.ErrorCode ?? status}` } : {}),
    })
    .eq("provider_message_id", sid);

  return NextResponse.json({ received: true });
}
