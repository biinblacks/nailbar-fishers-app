import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { publicUrlFor, verifyTwilioSignature } from "@/lib/webhooks/verify";

/** TwiML response with the content type Twilio requires. */
export function xml(body: string): NextResponse {
  return new NextResponse(body, { status: 200, headers: { "Content-Type": "text/xml; charset=utf-8" } });
}

export interface VerifiedForm {
  ok: true;
  params: Record<string, string>;
}
export interface RejectedForm {
  ok: false;
  response: NextResponse;
}

/**
 * Parse and authenticate a Twilio webhook.
 *
 * Every route here can start a phone call that costs money and reaches real
 * customers, so an unsigned request is refused rather than answered.
 */
export async function verifiedForm(request: NextRequest): Promise<VerifiedForm | RejectedForm> {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return { ok: false, response: NextResponse.json({ error: "Twilio not configured" }, { status: 503 }) };
  }
  const form = await request.formData().catch(() => null);
  if (!form) return { ok: false, response: NextResponse.json({ error: "Invalid body" }, { status: 400 }) };

  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = typeof v === "string" ? v : "";

  if (!verifyTwilioSignature(publicUrlFor(request), params, request.headers.get("x-twilio-signature"), authToken)) {
    return { ok: false, response: NextResponse.json({ error: "Invalid signature" }, { status: 403 }) };
  }
  return { ok: true, params };
}

/** Absolute URL for the next webhook in the call flow. */
export function callbackUrl(request: NextRequest, path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (base?.startsWith("https://")) return `${base}${path}`;
  const current = new URL(publicUrlFor(request));
  return `${current.origin}${path}`;
}
