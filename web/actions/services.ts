"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { serviceSchema } from "@/lib/validation";
import {
  bool,
  friendlyDbError,
  fromZodError,
  num,
  optionalStr,
  str,
  type ActionState,
} from "@/lib/action-state";

function parseService(formData: FormData) {
  const priceDollars = num(formData, "price") ?? 0;
  const categoryId = optionalStr(formData, "category_id");
  return serviceSchema.safeParse({
    name: str(formData, "name"),
    description: optionalStr(formData, "description"),
    price_cents: Math.round(priceDollars * 100),
    price_label: optionalStr(formData, "price_label"),
    duration_minutes: num(formData, "duration_minutes") ?? 30,
    category_id: categoryId,
    is_active: bool(formData, "is_active"),
    display_order: num(formData, "display_order") ?? 0,
  });
}

export async function createServiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon } = await requireSalonAccess(slug);
  const parsed = parseService(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({ ...parsed.data, salon_id: salon.id });
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/services`);
  redirect(`/app/${slug}/services`);
}

export async function updateServiceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const parsed = parseService(formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update(parsed.data)
    .eq("id", id)
    .eq("salon_id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/services`);
  return { success: "Service saved." };
}

export async function toggleServiceAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const active = bool(formData, "is_active");
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  await supabase.from("services").update({ is_active: active }).eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/services`);
}

export async function deleteServiceAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/services`);
  redirect(`/app/${slug}/services`);
}

export async function createCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const name = str(formData, "name");
  if (name.length < 1 || name.length > 60) {
    return { error: "Category name must be 1–60 characters.", fieldErrors: { name: "Required" } };
  }
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  const { count } = await supabase
    .from("service_categories")
    .select("id", { count: "exact", head: true })
    .eq("salon_id", salon.id);
  const { error } = await supabase
    .from("service_categories")
    .insert({ salon_id: salon.id, name, display_order: (count ?? 0) + 1 });
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/services`);
  return { success: `Category "${name}" added.` };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  // services.category_id is ON DELETE SET NULL, so services survive.
  await supabase.from("service_categories").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/services`);
}
