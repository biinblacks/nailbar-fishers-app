import { ZodError } from "zod";

// Shared shape returned by every server action so forms can render feedback
// through React's useActionState hook.
export interface ActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
}

export const initialActionState: ActionState = {};

export function fromZodError(err: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: "Please fix the highlighted fields.", fieldErrors };
}

/** Maps Postgres/PostgREST errors to friendly messages. */
export function friendlyDbError(message: string): string {
  if (/duplicate key|unique constraint/i.test(message)) {
    if (/slug/i.test(message)) return "That salon URL is already taken. Pick another one.";
    if (/phone/i.test(message)) return "A customer with that phone number already exists.";
    if (/name/i.test(message)) return "An item with that name already exists.";
    return "That record already exists.";
  }
  if (/row-level security/i.test(message)) {
    return "You do not have permission to do that.";
  }
  return message;
}

export function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function optionalStr(formData: FormData, key: string): string | null {
  const v = str(formData, key);
  return v === "" ? null : v;
}

export function bool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function num(formData: FormData, key: string): number | undefined {
  const v = str(formData, key);
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}
