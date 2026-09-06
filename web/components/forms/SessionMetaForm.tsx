"use client";

import { useActionState } from "react";
import { attachSessionCustomerAction } from "@/actions/interpreter";
import { initialActionState } from "@/lib/action-state";
import { Input, Select } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface Props {
  slug: string;
  id: string;
  title: string | null;
  customerId: string | null;
  customers: Array<{ id: string; full_name: string; phone: string }>;
}

export function SessionMetaForm({ slug, id, title, customerId, customers }: Props) {
  const [state, action] = useActionState(attachSessionCustomerAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Title" name="title" defaultValue={title ?? ""} maxLength={120} />
        <Select label="Guest (customer profile)" name="customer_id" defaultValue={customerId ?? ""}>
          <option value="">Not linked</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} · {c.phone}
            </option>
          ))}
        </Select>
      </div>
      <FormMessage state={state} />
      <SubmitButton variant="secondary">Save</SubmitButton>
    </form>
  );
}
