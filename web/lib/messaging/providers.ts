import "server-only";

export class MessagingNotConfigured extends Error {}

export interface SendResult {
  provider: string;
  providerMessageId: string | null;
}

/** Normalises US-style numbers to E.164; leaves already-international numbers alone. */
export function toE164(phone: string, defaultCountry = "+1"): string | null {
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 8 ? `+${digits}` : null;
}

function dryRun(): boolean {
  return process.env.MESSAGING_DRY_RUN === "true";
}

export function smsConfigured(): boolean {
  return dryRun() || !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

export function emailConfigured(): boolean {
  return dryRun() || !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Twilio Programmable SMS through its REST API (no SDK needed). */
export async function sendSms(to: string, body: string): Promise<SendResult> {
  if (dryRun()) return { provider: "dry-run", providerMessageId: null };
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new MessagingNotConfigured("SMS is not configured (TWILIO_* env vars).");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message ?? "send failed"}`);
  return { provider: "twilio", providerMessageId: data.sid ?? null };
}

/** Resend transactional email. */
export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (dryRun()) return { provider: "dry-run", providerMessageId: null };
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new MessagingNotConfigured("Email is not configured (RESEND_API_KEY / EMAIL_FROM).");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data.message ?? "send failed"}`);
  return { provider: "resend", providerMessageId: data.id ?? null };
}
