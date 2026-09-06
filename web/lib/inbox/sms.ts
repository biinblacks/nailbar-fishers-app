import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { sendSms, toE164 } from "@/lib/messaging/providers";

type Db = SupabaseClient<Database>;

export interface InboundSms {
  from: string;
  to: string;
  body: string;
  messageSid: string;
}

export interface RoutedConversation {
  salon: { id: string; name: string; slug: string; sms_number: string | null; sms_ai_autoreply: boolean; ai_enabled: boolean };
  conversationId: string;
  sessionId: string;
  customerId: string | null;
}

/**
 * Routes an inbound text to a salon conversation: matches the salon by the
 * number the guest texted, links (or creates) the customer by phone, and
 * reuses the open SMS thread for that number.
 */
export async function routeInboundSms(db: Db, sms: InboundSms): Promise<RoutedConversation | null> {
  const to = toE164(sms.to) ?? sms.to;
  const from = toE164(sms.from) ?? sms.from;

  const { data: salon } = await db
    .from("salons")
    .select("id, name, slug, sms_number, sms_ai_autoreply, ai_enabled")
    .eq("sms_number", to)
    .eq("is_active", true)
    .maybeSingle();
  if (!salon) return null;

  const { data: customer } = await db
    .from("customers")
    .select("id, full_name, preferred_language")
    .eq("salon_id", salon.id)
    .eq("phone", from)
    .maybeSingle();

  const sessionId = `sms:${from}`;
  const { data: existing } = await db
    .from("chat_conversations")
    .select("id, customer_id")
    .eq("salon_id", salon.id)
    .eq("session_id", sessionId)
    .maybeSingle();

  let conversationId: string;
  if (existing) {
    conversationId = existing.id;
    await db
      .from("chat_conversations")
      .update({
        needs_human: true,
        resolved_at: null,
        contact_number: from,
        ...(customer && !existing.customer_id ? { customer_id: customer.id, customer_name: customer.full_name } : {}),
      })
      .eq("id", conversationId);
  } else {
    const { data: created, error } = await db
      .from("chat_conversations")
      .insert({
        salon_id: salon.id,
        session_id: sessionId,
        channel: "sms",
        contact_number: from,
        customer_phone: from,
        customer_id: customer?.id ?? null,
        customer_name: customer?.full_name ?? null,
        language: customer?.preferred_language === "vi" ? "vi" : "en",
        needs_human: true,
      })
      .select("id")
      .single();
    if (error || !created) return null;
    conversationId = created.id;
  }

  await db.from("chat_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: sms.body,
    channel: "sms",
  });

  await db.from("message_log").insert({
    salon_id: salon.id,
    customer_id: customer?.id ?? null,
    channel: "sms",
    direction: "inbound",
    recipient: to,
    body: sms.body,
    provider: "twilio",
    provider_message_id: sms.messageSid,
    status: "received",
  });

  return { salon, conversationId, sessionId, customerId: customer?.id ?? null };
}

export interface StaffReply {
  salonId: string;
  conversationId: string;
  text: string;
  userId: string;
}

/** Sends a staff reply out over SMS and appends it to the transcript. */
export async function sendConversationReply(db: Db, reply: StaffReply): Promise<{ ok: true } | { error: string }> {
  const { data: conversation } = await db
    .from("chat_conversations")
    .select("id, contact_number, customer_phone, customer_id, channel, salons(name, sms_number)")
    .eq("id", reply.conversationId)
    .eq("salon_id", reply.salonId)
    .maybeSingle();
  if (!conversation) return { error: "Conversation not found." };

  const raw = conversation.contact_number ?? conversation.customer_phone;
  const to = raw ? toE164(raw) : null;
  if (!to) return { error: "This conversation has no phone number to reply to." };

  try {
    const result = await sendSms(to, reply.text, conversation.salons?.sms_number ?? null);
    await db.from("message_log").insert({
      salon_id: reply.salonId,
      customer_id: conversation.customer_id,
      channel: "sms",
      direction: "outbound",
      recipient: to,
      body: reply.text,
      provider: result.provider,
      provider_message_id: result.providerMessageId,
      status: "sent",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send the text." };
  }

  await db.from("chat_messages").insert({
    conversation_id: reply.conversationId,
    role: "assistant",
    content: reply.text,
    channel: "sms",
    sent_by: reply.userId,
  });
  await db.from("chat_conversations").update({ needs_human: false }).eq("id", reply.conversationId);

  return { ok: true };
}
