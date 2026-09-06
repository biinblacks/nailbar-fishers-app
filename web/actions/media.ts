"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import { MediaError, removeSalonImage, storagePathFromUrl, uploadSalonImage } from "@/lib/media";
import { str, type ActionState } from "@/lib/action-state";

function firstFile(formData: FormData, key: string): File | null {
  const f = formData.get(key);
  return f instanceof File && f.size > 0 ? f : null;
}

function errorState(err: unknown): ActionState {
  return { error: err instanceof MediaError ? err.message : "Upload failed. Please try again." };
}

// ---------------------------------------------------------------------------
// Salon logo
// ---------------------------------------------------------------------------
export async function uploadLogoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can change the logo." };
  const file = firstFile(formData, "file");
  if (!file) return { error: "Choose an image to upload." };

  const supabase = await createClient();
  try {
    const { url } = await uploadSalonImage(supabase, salon.id, "logo", file);
    await removeSalonImage(supabase, storagePathFromUrl(salon.logo_url));
    const { error } = await supabase.from("salons").update({ logo_url: url }).eq("id", salon.id);
    if (error) return { error: error.message };
  } catch (err) {
    return errorState(err);
  }
  revalidatePath(`/app/${slug}`, "layout");
  revalidatePath(`/s/${slug}`, "layout");
  return { success: "Logo updated." };
}

export async function removeLogoAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return;
  const supabase = await createClient();
  await removeSalonImage(supabase, storagePathFromUrl(salon.logo_url));
  await supabase.from("salons").update({ logo_url: null }).eq("id", salon.id);
  revalidatePath(`/app/${slug}`, "layout");
  revalidatePath(`/s/${slug}`, "layout");
}

// ---------------------------------------------------------------------------
// Staff photo
// ---------------------------------------------------------------------------
export async function uploadStaffPhotoAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const staffId = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const file = firstFile(formData, "file");
  if (!file) return { error: "Choose an image to upload." };

  const supabase = await createClient();
  const { data: member } = await supabase.from("staff").select("photo_url").eq("id", staffId).eq("salon_id", salon.id).maybeSingle();
  if (!member) return { error: "Team member not found." };

  try {
    const { url } = await uploadSalonImage(supabase, salon.id, "staff", file);
    await removeSalonImage(supabase, storagePathFromUrl(member.photo_url));
    const { error } = await supabase.from("staff").update({ photo_url: url }).eq("id", staffId).eq("salon_id", salon.id);
    if (error) return { error: error.message };
  } catch (err) {
    return errorState(err);
  }
  revalidatePath(`/app/${slug}/staff`);
  revalidatePath(`/app/${slug}/staff/${staffId}`);
  revalidatePath(`/s/${slug}`);
  return { success: "Photo updated." };
}

export async function removeStaffPhotoAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const staffId = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data: member } = await supabase.from("staff").select("photo_url").eq("id", staffId).eq("salon_id", salon.id).maybeSingle();
  if (!member) return;
  await removeSalonImage(supabase, storagePathFromUrl(member.photo_url));
  await supabase.from("staff").update({ photo_url: null }).eq("id", staffId).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/staff/${staffId}`);
  revalidatePath(`/s/${slug}`);
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
export async function addGalleryImagesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon } = await requireSalonAccess(slug);
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 10);
  if (files.length === 0) return { error: "Choose one or more images." };
  const caption = str(formData, "caption").slice(0, 120) || null;

  const supabase = await createClient();
  const { count } = await supabase.from("salon_gallery").select("id", { count: "exact", head: true }).eq("salon_id", salon.id);
  let order = (count ?? 0) + 1;
  let uploaded = 0;
  try {
    for (const file of files) {
      const { url, path } = await uploadSalonImage(supabase, salon.id, "gallery", file);
      const { error } = await supabase
        .from("salon_gallery")
        .insert({ salon_id: salon.id, image_url: url, storage_path: path, caption, display_order: order++ });
      if (error) return { error: error.message };
      uploaded++;
    }
  } catch (err) {
    if (uploaded === 0) return errorState(err);
  }
  revalidatePath(`/app/${slug}/gallery`);
  revalidatePath(`/s/${slug}`);
  return { success: `${uploaded} image${uploaded === 1 ? "" : "s"} added.` };
}

export async function updateGalleryCaptionAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const caption = str(formData, "caption").slice(0, 120) || null;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  await supabase.from("salon_gallery").update({ caption }).eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/gallery`);
  revalidatePath(`/s/${slug}`);
}

export async function deleteGalleryImageAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data: row } = await supabase.from("salon_gallery").select("storage_path, image_url").eq("id", id).eq("salon_id", salon.id).maybeSingle();
  if (!row) return;
  await removeSalonImage(supabase, row.storage_path ?? storagePathFromUrl(row.image_url));
  await supabase.from("salon_gallery").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/gallery`);
  revalidatePath(`/s/${slug}`);
}
