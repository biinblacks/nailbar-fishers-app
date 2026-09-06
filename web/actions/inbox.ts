"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { str, bool } from "@/lib/action-state";

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
