"use client";

import { useActionState } from "react";
import { createServiceAction, updateServiceAction } from "@/actions/services";
import { initialActionState } from "@/lib/action-state";
import type { Service, ServiceCategory } from "@/lib/types";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface Props {
  slug: string;
  categories: ServiceCategory[];
  service?: Service;
}

export function ServiceForm({ slug, categories, service }: Props) {
  const [state, action] = useActionState(
    service ? updateServiceAction : createServiceAction,
    initialActionState
  );
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {service && <input type="hidden" name="id" value={service.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Service name"
          name="name"
          defaultValue={service?.name ?? ""}
          required
          wrapperClassName="sm:col-span-2"
          error={fe.name}
        />
        <Input
          label="Price ($)"
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={service ? (service.price_cents / 100).toString() : ""}
          required
          error={fe.price_cents}
        />
        <Input
          label="Price label (optional)"
          name="price_label"
          placeholder="e.g. starts at $65"
          defaultValue={service?.price_label ?? ""}
          hint="Shown instead of the price when set"
          error={fe.price_label}
        />
        <Input
          label="Duration (minutes)"
          name="duration_minutes"
          type="number"
          min="5"
          step="5"
          defaultValue={service?.duration_minutes ?? 30}
          required
          error={fe.duration_minutes}
        />
        <Select label="Category" name="category_id" defaultValue={service?.category_id ?? ""} error={fe.category_id}>
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Textarea
          label="Description (optional)"
          name="description"
          defaultValue={service?.description ?? ""}
          wrapperClassName="sm:col-span-2"
          error={fe.description}
        />
        <Input
          label="Display order"
          name="display_order"
          type="number"
          min="0"
          defaultValue={service?.display_order ?? 0}
          error={fe.display_order}
        />
        <div className="flex items-end pb-3">
          <Checkbox label="Active (bookable and visible to customers)" name="is_active" defaultChecked={service?.is_active ?? true} />
        </div>
      </div>
      <FormMessage state={state} />
      <SubmitButton>{service ? "Save service" : "Add service"}</SubmitButton>
    </form>
  );
}
