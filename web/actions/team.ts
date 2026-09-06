"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import type { SalonRole } from "@/lib/types";
import { friendlyDbError, fromZodError, str, type ActionState } from "@/lib/action-state";

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email").max(120),
  role: z.enum(["owner", "admin", "staff"]),
});

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/**
 * Invite a teammate. New accounts get a Supabase Auth invitation email whose
 * link lands on /invite/<token>; existing accounts get a shareable link
 * (Supabase does not send arbitrary transactional email — Phase 4 adds Resend).
 */
export async function inviteMemberAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role, userId } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can invite teammates." };

  const parsed = inviteSchema.safeParse({ email: str(formData, "email").toLowerCase(), role: str(formData, "role") || "staff" });
  if (!parsed.success) return fromZodError(parsed.error);
  if (parsed.data.role === "owner" && role !== "owner") return { error: "Only an owner can invite another owner." };

  const supabase = await createClient();
  const { data: invite, error } = await supabase
    .from("salon_invites")
    .insert({ salon_id: salon.id, email: parsed.data.email, role: parsed.data.role, invited_by: userId })
    .select("token")
    .single();
  if (error) {
    if (/salon_invites_pending_email_idx/.test(error.message)) return { error: "That email already has a pending invite." };
    return { error: friendlyDbError(error.message) };
  }

  const link = `${siteUrl()}/invite/${invite.token}`;
  let emailed = false;
  try {
    const { error: inviteErr } = await createAdminClient().auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/invite/${invite.token}`,
      data: { invited_to_salon: salon.name },
    });
    emailed = !inviteErr;
  } catch {
    emailed = false;
  }

  revalidatePath(`/app/${slug}/settings`);
  return {
    success: emailed
      ? `Invitation email sent to ${parsed.data.email}. You can also share this link: ${link}`
      : `${parsed.data.email} already has an account, so no email was sent. Share this link with them: ${link}`,
  };
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return;
  const supabase = await createClient();
  await supabase.from("salon_invites").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/settings`);
}

async function ownerCount(salonId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("salon_members")
    .select("user_id", { count: "exact", head: true })
    .eq("salon_id", salonId)
    .eq("role", "owner");
  return count ?? 0;
}

export async function updateMemberRoleAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const targetUserId = str(formData, "user_id");
  const newRole = str(formData, "role") as SalonRole;
  const { salon, role } = await requireSalonAccess(slug);
  if (role !== "owner" || !["owner", "admin", "staff"].includes(newRole)) return;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("salon_members")
    .select("role")
    .eq("salon_id", salon.id)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!target) return;
  if (target.role === "owner" && newRole !== "owner" && (await ownerCount(salon.id)) <= 1) return; // keep at least one owner

  await supabase.from("salon_members").update({ role: newRole }).eq("salon_id", salon.id).eq("user_id", targetUserId);
  revalidatePath(`/app/${slug}`, "layout");
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const targetUserId = str(formData, "user_id");
  const { salon, role, userId } = await requireSalonAccess(slug);
  const isSelf = targetUserId === userId;
  if (role !== "owner" && !isSelf) return;

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("salon_members")
    .select("role")
    .eq("salon_id", salon.id)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!target) return;
  if (target.role === "owner" && (await ownerCount(salon.id)) <= 1) return;

  await supabase.from("salon_members").delete().eq("salon_id", salon.id).eq("user_id", targetUserId);
  revalidatePath(`/app/${slug}`, "layout");
}
