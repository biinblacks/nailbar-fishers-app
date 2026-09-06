"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";
import { initialActionState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface Props {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  hidden: Record<string, string>;
  label: string;
  name?: string;
  multiple?: boolean;
  buttonText?: string;
  children?: React.ReactNode;
}

export function ImageUploadForm({ action, hidden, label, name = "file", multiple, buttonText = "Upload", children }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className="space-y-3" encType="multipart/form-data">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-blush-800">
        {label}
        <input
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={multiple}
          required
          className="input-field file:mr-3 file:rounded-full file:border-0 file:bg-blush-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-blush-600"
        />
      </label>
      {children}
      <FormMessage state={state} />
      <SubmitButton variant="secondary" pendingText="Uploading…">
        {buttonText}
      </SubmitButton>
      <p className="text-xs text-blush-800/60">JPG, PNG, WebP or GIF up to 5 MB.</p>
    </form>
  );
}
