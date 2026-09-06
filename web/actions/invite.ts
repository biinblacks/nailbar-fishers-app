"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { str, type ActionState } from "@/lib/action-state";

export async function acceptInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = str(formData, "token");
  if (!/^[a-f0-9]{48}$/.test(token)) return { error: "Invalid invite link." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_salon_invite", { p_token: token });
  if (error) return { error: error.message.replace(/^.*?: /, "") };

  redirect(`/app/${data.slug}`);
}
