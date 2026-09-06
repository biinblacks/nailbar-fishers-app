"use client";

import { useActionState } from "react";
import { createCategoryAction } from "@/actions/services";
import { initialActionState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function CategoryForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(createCategoryAction, initialActionState);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex gap-2">
        <input
          name="name"
          aria-label="New category name"
          placeholder="New category, e.g. Pedicure"
          className="input-field"
          required
          maxLength={60}
        />
        <SubmitButton variant="secondary" pendingText="Adding…">
          Add
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
