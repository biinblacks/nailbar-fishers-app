"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSalonAccess } from "@/lib/salon";
import { sendConversationReply } from "@/lib/inbox/sms";
import { bool, str, type ActionState } from "@/lib/action-state";

/** Toggle the "needs human" flag / mark a conversation resolved from the inbox. */
export async function setConversationFlagsAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const needsHuman = bool(formData, "needs_human");
  const resolved = bool(formData, "resolved");
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  await supabase
    .from("chat_conversations")
    .update({ needs_human: needsHuman, resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("salon_id", salon.id);

  revalidatePath(`/app/${slug}/inbox`);
  revalidatePath(`/app/${slug}/inbox/${id}`);
}

/** Reply to an SMS conversation from the inbox. */
export async function replyToConversationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const text = str(formData, "text").slice(0, 1000);
  const { salon, userId } = await requireSalonAccess(slug);
  if (!text) return { error: "Write a message first." };

  // Service role: the reply writes to message_log, which members cannot insert into.
  const result = await sendConversationReply(createAdminClient(), { salonId: salon.id, conversationId: id, text, userId });
  if ("error" in result) return { error: result.error };

  revalidatePath(`/app/${slug}/inbox/${id}`);
  revalidatePath(`/app/${slug}/inbox`);
  return { success: "Reply sent." };
}
