"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { LANGUAGE_CODES } from "@/lib/interpreter/languages";
import { friendlyDbError, fromZodError, num, optionalStr, str, type ActionState } from "@/lib/action-state";

const langSchema = z.enum(LANGUAGE_CODES as [string, ...string[]]);

// ---------------------------------------------------------------------------
// Sessions (called from the console; plain functions returning data)
// ---------------------------------------------------------------------------
export async function startInterpreterSession(slug: string, langA: string, langB: string): Promise<{ id: string } | { error: string }> {
  const parsed = z.object({ langA: langSchema, langB: langSchema }).safeParse({ langA, langB });
  if (!parsed.success) return { error: "Unsupported language." };
  const { salon, userId } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interpreter_sessions")
    .insert({ salon_id: salon.id, started_by: userId, lang_a: parsed.data.langA, lang_b: parsed.data.langB })
    .select("id")
    .single();
  if (error) return { error: friendlyDbError(error.message) };
  return { id: data.id };
}

const turnSchema = z.object({
  sessionId: z.string().uuid(),
  speaker: z.enum(["a", "b"]),
  sourceLang: langSchema,
  targetLang: langSchema,
  sourceText: z.string().min(1).max(2000),
  translatedText: z.string().min(1).max(2000),
  via: z.enum(["ai", "phrase", "manual"]),
});

export async function appendInterpreterTurn(slug: string, input: z.infer<typeof turnSchema>): Promise<{ ok: true } | { error: string }> {
  const parsed = turnSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid turn." };
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("interpreter_turns").insert({
    session_id: parsed.data.sessionId,
    salon_id: salon.id,
    speaker: parsed.data.speaker,
    source_lang: parsed.data.sourceLang,
    target_lang: parsed.data.targetLang,
    source_text: parsed.data.sourceText,
    translated_text: parsed.data.translatedText,
    via: parsed.data.via,
  });
  if (error) return { error: friendlyDbError(error.message) };
  return { ok: true };
}

export async function endInterpreterSession(slug: string, sessionId: string): Promise<{ ok: true } | { error: string }> {
  if (!z.string().uuid().safeParse(sessionId).success) return { error: "Invalid session." };
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { error } = await supabase
    .from("interpreter_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("salon_id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(`/app/${slug}/interpreter/history`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// History page actions (form-based)
// ---------------------------------------------------------------------------
export async function attachSessionCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const customerId = optionalStr(formData, "customer_id");
  const title = optionalStr(formData, "title");
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { error } = await supabase
    .from("interpreter_sessions")
    .update({ customer_id: customerId, ...(title !== null ? { title: title.slice(0, 120) } : {}) })
    .eq("id", id)
    .eq("salon_id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(`/app/${slug}/interpreter/history/${id}`);
  return { success: "Saved." };
}

export async function deleteInterpreterSessionAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  await supabase.from("interpreter_sessions").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/interpreter/history`);
  redirect(`/app/${slug}/interpreter/history`);
}

// ---------------------------------------------------------------------------
// Custom quick phrases
// ---------------------------------------------------------------------------
const phraseSchema = z.object({
  category: z.string().min(1, "Category is required").max(40),
  text_en: z.string().min(1, "English text is required").max(300),
  text_vi: z.string().min(1, "Vietnamese text is required").max(300),
  display_order: z.number().int().min(0).max(9999),
  is_active: z.boolean(),
});

export async function upsertPhraseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = optionalStr(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const parsed = phraseSchema.safeParse({
    category: str(formData, "category"),
    text_en: str(formData, "text_en"),
    text_vi: str(formData, "text_vi"),
    display_order: num(formData, "display_order") ?? 0,
    is_active: formData.has("is_active") ? formData.get("is_active") === "on" : true,
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("quick_phrases").update(parsed.data).eq("id", id).eq("salon_id", salon.id)
    : await supabase.from("quick_phrases").insert({ ...parsed.data, salon_id: salon.id });
  if (error) return { error: friendlyDbError(error.message) };
  revalidatePath(`/app/${slug}/interpreter`, "layout");
  return { success: id ? "Phrase saved." : "Phrase added." };
}

export async function deletePhraseAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  await supabase.from("quick_phrases").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}/interpreter`, "layout");
}
