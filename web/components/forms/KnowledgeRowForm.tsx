"use client";

import { useActionState, useState } from "react";
import { upsertKnowledgeRowAction } from "@/actions/receptionist";
import { initialActionState } from "@/lib/action-state";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type KnowledgeTable = "ai_knowledge" | "faqs" | "salon_policies" | "promotions";

interface FieldSpec {
  name: string;
  label: string;
  kind: "text" | "textarea" | "date" | "checkbox" | "number";
  placeholder?: string;
}

export const FIELDS: Record<KnowledgeTable, FieldSpec[]> = {
  ai_knowledge: [
    { name: "topic", label: "Topic", kind: "text", placeholder: "e.g. loyalty_program" },
    { name: "content", label: "What the AI should know", kind: "textarea" },
    { name: "is_active", label: "Active", kind: "checkbox" },
  ],
  faqs: [
    { name: "question", label: "Question", kind: "text" },
    { name: "answer", label: "Answer", kind: "textarea" },
    { name: "display_order", label: "Order", kind: "number" },
    { name: "is_active", label: "Active", kind: "checkbox" },
  ],
  salon_policies: [
    { name: "title", label: "Policy title", kind: "text", placeholder: "e.g. Cancellation policy" },
    { name: "content", label: "Policy", kind: "textarea" },
    { name: "display_order", label: "Order", kind: "number" },
  ],
  promotions: [
    { name: "title", label: "Title", kind: "text" },
    { name: "description", label: "Details", kind: "textarea" },
    { name: "starts_at", label: "Starts", kind: "date" },
    { name: "ends_at", label: "Ends", kind: "date" },
    { name: "is_active", label: "Active", kind: "checkbox" },
  ],
};

interface Props {
  slug: string;
  table: KnowledgeTable;
  row?: Record<string, unknown> & { id: string };
  /** Collapsed "add" form that expands on click. */
  collapsible?: boolean;
}

export function KnowledgeRowForm({ slug, table, row, collapsible }: Props) {
  const [state, action] = useActionState(upsertKnowledgeRowAction, initialActionState);
  const [open, setOpen] = useState(!collapsible);
  const fe = state.fieldErrors ?? {};

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary">
        Add new
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-blush-100 bg-white p-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="table" value={table} />
      {row && <input type="hidden" name="id" value={row.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS[table].map((f) => {
          const value = row?.[f.name];
          if (f.kind === "textarea") {
            return <Textarea key={f.name} label={f.label} name={f.name} defaultValue={(value as string) ?? ""} wrapperClassName="sm:col-span-2" error={fe[f.name]} />;
          }
          if (f.kind === "checkbox") {
            return (
              <div key={f.name} className="flex items-end pb-2">
                <Checkbox label={f.label} name={f.name} defaultChecked={value === undefined ? true : !!value} />
              </div>
            );
          }
          return (
            <Input
              key={f.name}
              label={f.label}
              name={f.name}
              type={f.kind === "date" ? "date" : f.kind === "number" ? "number" : "text"}
              defaultValue={value == null ? "" : String(value)}
              placeholder={f.placeholder}
              wrapperClassName={f.kind === "text" && FIELDS[table][0].name === f.name ? "sm:col-span-2" : undefined}
              error={fe[f.name]}
            />
          );
        })}
      </div>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton variant="secondary">{row ? "Save" : "Add"}</SubmitButton>
        {collapsible && (
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-blush-500 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
