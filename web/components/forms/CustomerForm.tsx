"use client";

import { useActionState } from "react";
import { createCustomerAction, updateCustomerAction } from "@/actions/customers";
import { initialActionState } from "@/lib/action-state";
import type { Customer } from "@/lib/types";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function CustomerForm({ slug, customer }: { slug: string; customer?: Customer }) {
  const [state, action] = useActionState(
    customer ? updateCustomerAction : createCustomerAction,
    initialActionState
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" name="full_name" defaultValue={customer?.full_name ?? ""} required error={fe.full_name} />
        <Input label="Phone" name="phone" type="tel" defaultValue={customer?.phone ?? ""} required error={fe.phone} />
        <Input label="Email (optional)" name="email" type="email" defaultValue={customer?.email ?? ""} error={fe.email} />
        <Select
          label="Preferred language"
          name="preferred_language"
          defaultValue={customer?.preferred_language ?? "en"}
          error={fe.preferred_language}
        >
          <option value="en">English</option>
          <option value="vi">Tiếng Việt</option>
        </Select>
        <Input
          label="Birthday (optional)"
          name="birthday"
          type="date"
          defaultValue={customer?.birthday ?? ""}
          hint="Used for birthday promotions later"
          error={fe.birthday}
        />
        <Input
          label="Tags (comma separated)"
          name="tags"
          placeholder="vip, gel-x, regular"
          defaultValue={customer?.tags?.join(", ") ?? ""}
          error={fe.tags}
        />
        <Textarea
          label="Notes"
          name="notes"
          placeholder="Allergies, favorite colors, preferred technician…"
          defaultValue={customer?.notes ?? ""}
          wrapperClassName="sm:col-span-2"
          error={fe.notes}
        />
        <Checkbox
          label="OK to send reminders and promotions"
          name="marketing_opt_in"
          defaultChecked={customer?.marketing_opt_in ?? true}
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton>{customer ? "Save customer" : "Add customer"}</SubmitButton>
    </form>
  );
}
