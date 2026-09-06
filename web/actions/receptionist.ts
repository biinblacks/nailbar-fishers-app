"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import { bool, friendlyDbError, fromZodError, num, optionalStr, str, type ActionState } from "@/lib/action-state";

// ---------------------------------------------------------------------------
// AI + booking settings on the salon row
// ---------------------------------------------------------------------------
const settingsSchema = z.object({
  ai_enabled: z.boolean(),
  ai_can_book: z.boolean(),
  ai_greeting: z.string().max(300).nullable(),
  online_booking_enabled: z.boolean(),
  booking_slot_minutes: z.number().int().min(5).max(120),
  booking_lead_minutes: z.number().int().min(0).max(10080),
  booking_window_days: z.number().int().min(1).max(365),
  booking_buffer_minutes: z.number().int().min(0).max(120),
  sms_number: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Use the full number in E.164 form, e.g. +13175550182")
    .nullable(),
  sms_ai_autoreply: z.boolean(),
});

export async function saveReceptionistSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, role } = await requireSalonAccess(slug);
  if (!canManageSalon(role)) return { error: "Only owners and admins can change these settings." };

  const parsed = settingsSchema.safeParse({
    ai_enabled: bool(formData, "ai_enabled"),
    ai_can_book: bool(formData, "ai_can_book"),
    ai_greeting: optionalStr(formData, "ai_greeting"),
    online_booking_enabled: bool(formData, "online_booking_enabled"),
    booking_slot_minutes: num(formData, "booking_slot_minutes") ?? 30,
    booking_lead_minutes: num(formData, "booking_lead_minutes") ?? 60,
    booking_window_days: num(formData, "booking_window_days") ?? 60,
    booking_buffer_minutes: num(formData, "booking_buffer_minutes") ?? 0,
    sms_number: optionalStr(formData, "sms_number"),
    sms_ai_autoreply: bool(formData, "sms_ai_autoreply"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("salons").update(parsed.data).eq("id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/receptionist`);
  revalidatePath(`/s/${slug}`, "layout");
  return { success: "Settings saved." };
}

// ---------------------------------------------------------------------------
// Knowledge tables: ai_knowledge, faqs, salon_policies, promotions
// ---------------------------------------------------------------------------
type KnowledgeTable = "ai_knowledge" | "faqs" | "salon_policies" | "promotions";
const TABLES: KnowledgeTable[] = ["ai_knowledge", "faqs", "salon_policies", "promotions"];

const rowSchemas: Record<KnowledgeTable, z.ZodTypeAny> = {
  ai_knowledge: z.object({
    topic: z.string().min(1, "Topic is required").max(80),
    content: z.string().min(1, "Content is required").max(4000),
    is_active: z.boolean(),
  }),
  faqs: z.object({
    question: z.string().min(1, "Question is required").max(300),
    answer: z.string().min(1, "Answer is required").max(2000),
    is_active: z.boolean(),
    display_order: z.number().int().min(0).max(9999),
  }),
  salon_policies: z.object({
    title: z.string().min(1, "Title is required").max(120),
    content: z.string().min(1, "Content is required").max(2000),
    display_order: z.number().int().min(0).max(9999),
  }),
  promotions: z.object({
    title: z.string().min(1, "Title is required").max(120),
    description: z.string().min(1, "Description is required").max(2000),
    starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    ends_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    is_active: z.boolean(),
  }),
};

function parseRow(table: KnowledgeTable, formData: FormData) {
  const raw: Record<string, unknown> = {};
  switch (table) {
    case "ai_knowledge":
      raw.topic = str(formData, "topic");
      raw.content = str(formData, "content");
      raw.is_active = formData.has("is_active") ? bool(formData, "is_active") : true;
      break;
    case "faqs":
      raw.question = str(formData, "question");
      raw.answer = str(formData, "answer");
      raw.is_active = formData.has("is_active") ? bool(formData, "is_active") : true;
      raw.display_order = num(formData, "display_order") ?? 0;
      break;
    case "salon_policies":
      raw.title = str(formData, "title");
      raw.content = str(formData, "content");
      raw.display_order = num(formData, "display_order") ?? 0;
      break;
    case "promotions":
      raw.title = str(formData, "title");
      raw.description = str(formData, "description");
      raw.starts_at = optionalStr(formData, "starts_at");
      raw.ends_at = optionalStr(formData, "ends_at");
      raw.is_active = formData.has("is_active") ? bool(formData, "is_active") : true;
      break;
  }
  return rowSchemas[table].safeParse(raw);
}

function tableFrom(formData: FormData): KnowledgeTable | null {
  const t = str(formData, "table") as KnowledgeTable;
  return TABLES.includes(t) ? t : null;
}

export async function upsertKnowledgeRowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const table = tableFrom(formData);
  if (!table) return { error: "Unknown section." };
  const id = optionalStr(formData, "id");
  const { salon } = await requireSalonAccess(slug);

  const parsed = parseRow(table, formData);
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from(table).update(parsed.data).eq("id", id).eq("salon_id", salon.id)
    : await supabase.from(table).insert({ ...parsed.data, salon_id: salon.id });
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}/receptionist`);
  return { success: id ? "Saved." : "Added." };
}

export async function deleteKnowledgeRowAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const table = tableFrom(formData);
  const id = str(formData, "id");
  if (!table || !id) return;
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  await supabase.from(table).delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/receptionist`);
}
