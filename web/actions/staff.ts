"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { staffSchema } from "@/lib/validation";
import { checkLimit } from "@/lib/billing/limits";
import {
  bool,
  friendlyDbError,
  fromZodError,
  num,
  optionalStr,
  str,
  type ActionState,
} from "@/lib/action-state";

function parseStaff(formData: FormData) {
  return staffSchema.safeParse({
    full_name: str(formData, "full_name"),
    title: optionalStr(formData, "title"),
    bio: optionalStr(formData, "bio"),
    phone: optionalStr(formData, "phone"),
    email: optionalStr(formData, "email"),
    color: optionalStr(formData, "color"),
    is_active: bool(formData, "is_active"),
    display_order: num(formData, "display_order") ?? 0,
  });
}

export async function createStaffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon } = await requireSalonAccess(slug);
  const parsed = parseStaff(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const limit = await checkLimit(salon.id, "staff");
  if (!limit.allowed && parsed.data.is_active) {
    return { error: `Your ${limit.planName} plan includes ${limit.limit} active technicians. Deactivate one or upgrade in Billing.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("staff").insert({ ...parsed.data, salon_id: salon.id });
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/staff`);
  redirect(`/app/${slug}/staff`);
}

export async function updateStaffAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const parsed = parseStaff(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update(parsed.data)
    .eq("id", id)
    .eq("salon_id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/staff`);
  return { success: "Team member saved." };
}

export async function toggleStaffAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const active = bool(formData, "is_active");
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  await supabase.from("staff").update({ is_active: active }).eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/staff`);
}

export async function deleteStaffAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  // appointments.staff_id is ON DELETE SET NULL, so history is preserved.
  await supabase.from("staff").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/staff`);
  redirect(`/app/${slug}/staff`);
}
