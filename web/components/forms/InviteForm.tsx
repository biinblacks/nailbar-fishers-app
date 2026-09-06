"use client";

import { useActionState } from "react";
import { inviteMemberAction } from "@/actions/team";
import { initialActionState } from "@/lib/action-state";
import type { SalonRole } from "@/lib/types";
import { Input, Select } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function InviteForm({ slug, myRole }: { slug: string; myRole: SalonRole }) {
  const [state, action] = useActionState(inviteMemberAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Input label="Teammate email" name="email" type="email" required placeholder="tech@example.com" error={state.fieldErrors?.email} />
        <Select label="Role" name="role" defaultValue="staff">
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
          {myRole === "owner" && <option value="owner">Owner</option>}
        </Select>
        <SubmitButton variant="secondary" pendingText="Inviting…">
          Send invite
        </SubmitButton>
      </div>
      <FormMessage state={state} />
      <p className="text-xs text-blush-800/60">
        Staff can manage the calendar and customers. Admins can also change services, hours and settings. Owners can manage the team.
      </p>
    </form>
  );
}
