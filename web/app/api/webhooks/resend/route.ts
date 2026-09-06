import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySvixSignature } from "@/lib/webhooks/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAP: Record<string, { status: string; field?: "delivered_at" | "failed_at" }> = {
  "email.sent": { status: "sent" },
  "email.delivered": { status: "delivered", field: "delivered_at" },
  "email.delivery_delayed": { status: "delayed" },
  "email.bounced": { status: "failed", field: "failed_at" },
  "email.complained": { status: "complained", field: "failed_at" },
  "email.opened": { status: "opened" },
  "email.clicked": { status: "clicked" },
};

/** Resend webhook (Svix-signed) → delivery status on message_log. */
export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const body = await request.text();
  const ok = verifySvixSignature(
    { id: request.headers.get("svix-id"), timestamp: request.headers.get("svix-timestamp"), signature: request.headers.get("svix-signature") },
    body,
    secret
  );
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 403 });

  let event: { type?: string; data?: { email_id?: string } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mapped = event.type ? MAP[event.type] : undefined;
  const emailId = event.data?.email_id;
  if (!mapped || !emailId) return NextResponse.json({ received: true });

  const now = new Date().toISOString();
  await createAdminClient()
    .from("message_log")
    .update({
      provider_status: event.type ?? null,
      status: mapped.status,
      ...(mapped.field === "delivered_at" ? { delivered_at: now } : {}),
      ...(mapped.field === "failed_at" ? { failed_at: now } : {}),
    })
    .eq("provider_message_id", emailId);

  return NextResponse.json({ received: true });
}
