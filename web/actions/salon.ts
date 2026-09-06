"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess, canManageSalon } from "@/lib/salon";
import { businessHoursSchema, createSalonSchema, salonProfileSchema } from "@/lib/validation";
import {
  bool,
  friendlyDbError,
  fromZodError,
  optionalStr,
  str,
  type ActionState,
} from "@/lib/action-state";
import { slugify } from "@/lib/format";
import { logAudit } from "@/lib/audit";

export async function createSalonAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = str(formData, "name");
  const rawSlug = str(formData, "slug");
  const parsed = createSalonSchema.safeParse({
    name,
    slug: rawSlug ? slugify(rawSlug) : slugify(name),
    phone: optionalStr(formData, "phone") ?? undefined,
    address: optionalStr(formData, "address") ?? undefined,
    timezone: str(formData, "timezone") || "America/Indiana/Indianapolis",
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_salon", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_phone: parsed.data.phone ?? undefined,
    p_address: parsed.data.address ?? undefined,
    p_email: undefined,
    p_timezone: parsed.data.timezone,
  });

  if (error) return { error: friendlyDbError(error.message) };

  const slug = (data as { slug?: string } | null)?.slug ?? parsed.data.slug;
  revalidatePath("/app");
  redirect(`/app/${slug}`);
}

export async function updateSalonProfileAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role, userId } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can edit the salon profile." };

  const parsed = salonProfileSchema.safeParse({
    name: str(formData, "name"),
    address: optionalStr(formData, "address"),
    phone: optionalStr(formData, "phone"),
    email: optionalStr(formData, "email"),
    timezone: str(formData, "timezone"),
    parking_info: optionalStr(formData, "parking_info"),
    google_review_link: optionalStr(formData, "google_review_link"),
    google_map_link: optionalStr(formData, "google_map_link"),
    instagram_link: optionalStr(formData, "instagram_link"),
    facebook_link: optionalStr(formData, "facebook_link"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("salons").update(parsed.data).eq("id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };

  await logAudit({ salonId: salon.id, userId, action: "salon.profile_update", entity: "salon", entityId: salon.id });
  revalidatePath(`/app/${slug}`, "layout");
  return { success: "Salon profile saved." };
}

export async function saveBusinessHoursAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can edit business hours." };

  const rows = Array.from({ length: 7 }, (_, day) => {
    const closed = bool(formData, `closed_${day}`);
    return {
      day_of_week: day,
      is_closed: closed,
      open_time: closed ? null : optionalStr(formData, `open_${day}`),
      close_time: closed ? null : optionalStr(formData, `close_${day}`),
    };
  });

  const parsed = businessHoursSchema.safeParse(rows);
  if (!parsed.success) return fromZodError(parsed.error);

  for (const row of parsed.data) {
    if (!row.is_closed && (!row.open_time || !row.close_time)) {
      return { error: "Open days need both an opening and closing time." };
    }
    if (!row.is_closed && row.open_time! >= row.close_time!) {
      return { error: "Closing time must be after opening time." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_hours")
    .upsert(
      parsed.data.map((row) => ({ ...row, salon_id: salon.id })),
      { onConflict: "salon_id,day_of_week" }
    );
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/settings`);
  return { success: "Business hours saved." };
}
