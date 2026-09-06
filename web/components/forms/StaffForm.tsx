"use client";

import { useActionState } from "react";
import { createStaffAction, updateStaffAction } from "@/actions/staff";
import { initialActionState } from "@/lib/action-state";
import type { Staff } from "@/lib/types";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function StaffForm({ slug, staff }: { slug: string; staff?: Staff }) {
  const [state, action] = useActionState(staff ? updateStaffAction : createStaffAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {staff && <input type="hidden" name="id" value={staff.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Full name" name="full_name" defaultValue={staff?.full_name ?? ""} required error={fe.full_name} />
        <Input
          label="Title"
          name="title"
          defaultValue={staff?.title ?? "Nail Technician"}
          error={fe.title}
        />
        <Input label="Phone (optional)" name="phone" type="tel" defaultValue={staff?.phone ?? ""} error={fe.phone} />
        <Input label="Email (optional)" name="email" type="email" defaultValue={staff?.email ?? ""} error={fe.email} />
        <Textarea
          label="Bio (optional)"
          name="bio"
          defaultValue={staff?.bio ?? ""}
          wrapperClassName="sm:col-span-2"
          error={fe.bio}
        />
        <Input
          label="Calendar color"
          name="color"
          type="color"
          defaultValue={staff?.color ?? "#ec4d7d"}
          className="h-11 w-24 p-1"
          error={fe.color}
        />
        <Input
          label="Display order"
          name="display_order"
          type="number"
          min="0"
          defaultValue={staff?.display_order ?? 0}
          error={fe.display_order}
        />
        <Checkbox label="Active (can be booked)" name="is_active" defaultChecked={staff?.is_active ?? true} />
      </div>
      <FormMessage state={state} />
      <SubmitButton>{staff ? "Save team member" : "Add team member"}</SubmitButton>
    </form>
  );
}
