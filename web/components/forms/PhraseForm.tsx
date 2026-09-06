"use client";

import { useActionState, useState } from "react";
import { upsertPhraseAction } from "@/actions/interpreter";
import { initialActionState } from "@/lib/action-state";
import { Checkbox, Input } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface Props {
  slug: string;
  phrase?: { id: string; category: string; text_en: string; text_vi: string; display_order: number; is_active: boolean };
  collapsible?: boolean;
}

export function PhraseForm({ slug, phrase, collapsible }: Props) {
  const [state, action] = useActionState(upsertPhraseAction, initialActionState);
  const [open, setOpen] = useState(!collapsible);
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        Add phrase
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-blush-100 bg-white p-4">
      <input type="hidden" name="slug" value={slug} />
      {phrase && <input type="hidden" name="id" value={phrase.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Category" name="category" defaultValue={phrase?.category ?? ""} placeholder="e.g. Service" required error={fe.category} />
        <Input label="Order" name="display_order" type="number" min={0} defaultValue={phrase?.display_order ?? 0} error={fe.display_order} />
        <Input label="English" name="text_en" defaultValue={phrase?.text_en ?? ""} required wrapperClassName="sm:col-span-2" error={fe.text_en} />
        <Input label="Tiếng Việt" name="text_vi" defaultValue={phrase?.text_vi ?? ""} required wrapperClassName="sm:col-span-2" error={fe.text_vi} />
        <Checkbox label="Active" name="is_active" defaultChecked={phrase?.is_active ?? true} />
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton variant="secondary">{phrase ? "Save" : "Add"}</SubmitButton>
        {collapsible && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-blush-500 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
