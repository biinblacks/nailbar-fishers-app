"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fromZodError, str, type ActionState } from "@/lib/action-state";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signupSchema = credentialsSchema.extend({
  full_name: z.string().min(2, "Enter your name").max(80),
});

function safeNext(next: string): string {
  return next.startsWith("/app") ? next : "/app";
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: str(formData, "email"),
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect(safeNext(str(formData, "next")));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    email: str(formData, "email"),
    password: formData.get("password") ?? "",
    full_name: str(formData, "full_name"),
  });
  if (!parsed.success) return fromZodError(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/app/new`,
    },
  });

  if (error) return { error: error.message };

  // When email confirmation is disabled in Supabase, a session exists now.
  if (data.session) redirect("/app/new");

  return {
    success: "Check your inbox — we sent a confirmation link. Open it to finish creating your account.",
  };
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = str(formData, "email");
  if (!z.string().email().safeParse(email).success) {
    return { error: "Enter a valid email.", fieldErrors: { email: "Enter a valid email" } };
  }
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/app`,
  });
  // Always report success so the form cannot be used to probe which emails exist.
  return { success: "If an account exists for that email, a reset link is on its way." };
}
