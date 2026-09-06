"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import { runAutomations } from "@/lib/automations/run";
import { bool, friendlyDbError, fromZodError, num, str, type ActionState } from "@/lib/action-state";

const ruleSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(80),
    is_enabled: z.boolean(),
    channel: z.enum(["sms", "email"]),
    offset_minutes: z.number().int().min(0).max(43200),
    interval_days: z.number().int().min(0).max(730).nullable(),
    template_en: z.string().min(1, "English template is required").max(1000),
    template_vi: z.string().min(1, "Vietnamese template is required").max(1000),
    send_hour_start: z.number().int().min(0).max(23),
    send_hour_end: z.number().int().min(1).max(24),
  })
  .refine((r) => r.send_hour_end > r.send_hour_start, { message: "Sending window end must be after start", path: ["send_hour_end"] });

export async function updateAutomationRuleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can change automations." };

  const hoursOffset = num(formData, "offset_hours");
  const parsed = ruleSchema.safeParse({
    name: str(formData, "name"),
    is_enabled: bool(formData, "is_enabled"),
    channel: str(formData, "channel") || "sms",
    offset_minutes: Math.round((hoursOffset ?? 0) * 60),
    interval_days: num(formData, "interval_days") ?? null,
    template_en: str(formData, "template_en"),
    template_vi: str(formData, "template_vi"),
    send_hour_start: num(formData, "send_hour_start") ?? 9,
    send_hour_end: num(formData, "send_hour_end") ?? 20,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").update(parsed.data).eq("id", id).eq("salon_id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(`/app/${slug}/automations`);
  return { success: "Automation saved." };
}

export async function toggleAutomationRuleAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const enabled = bool(formData, "is_enabled");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return;
  const supabase = await createClient();
  await supabase.from("automation_rules").update({ is_enabled: enabled }).eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/automations`);
}

export async function cancelAutomationJobAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  await supabase
    .from("automation_jobs")
    .update({ status: "cancelled", last_error: "cancelled by staff" })
    .eq("id", id)
    .eq("salon_id", salon.id)
    .eq("status", "pending");
  revalidatePath(`/app/${slug}/automations`);
}

/** Runs planning + sending for this salon immediately (same code as the cron). */
export async function runAutomationsNowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can run automations." };
  try {
    const summary = await runAutomations({ salonId: salon.id, siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "" });
    revalidatePath(`/app/${slug}/automations`);
    return {
      success: `Planned ${summary.planned} new message${summary.planned === 1 ? "" : "s"}; sent ${summary.sent}, deferred ${summary.deferred} (outside sending hours), skipped ${summary.skipped}, failed ${summary.failed}.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Run failed." };
  }
}
