"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { customerSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import {
  bool,
  friendlyDbError,
  fromZodError,
  optionalStr,
  str,
  type ActionState,
} from "@/lib/action-state";

function parseCustomer(formData: FormData) {
  const tags = str(formData, "tags")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return customerSchema.safeParse({
    full_name: str(formData, "full_name"),
    phone: str(formData, "phone"),
    email: optionalStr(formData, "email"),
    preferred_language: str(formData, "preferred_language") || "en",
    birthday: optionalStr(formData, "birthday"),
    notes: optionalStr(formData, "notes"),
    tags,
    marketing_opt_in: bool(formData, "marketing_opt_in"),
  });
}

export async function createCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon } = await requireSalonAccess(slug);
  const parsed = parseCustomer(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, salon_id: salon.id })
    .select("id")
    .single();
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/customers`);
  redirect(`/app/${slug}/customers/${data.id}`);
}

export async function updateCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const parsed = parseCustomer(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update(parsed.data)
    .eq("id", id)
    .eq("salon_id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/customers`);
  revalidatePath(`/app/${slug}/customers/${id}`);
  return { success: "Customer saved." };
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon, userId } = await requireSalonAccess(slug);

  const supabase = await createClient();
  // appointments.customer_id is ON DELETE SET NULL; the name/phone snapshot on
  // each appointment keeps the calendar readable.
  await supabase.from("customers").delete().eq("id", id).eq("salon_id", salon.id);
  await logAudit({ salonId: salon.id, userId, action: "customer.delete", entity: "customer", entityId: id });
  revalidatePath(`/app/${slug}/customers`);
  redirect(`/app/${slug}/customers`);
}
