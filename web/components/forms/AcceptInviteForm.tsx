"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/actions/invite";
import { initialActionState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useActionState(acceptInviteAction, initialActionState);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Joining…">
        Accept invitation
      </SubmitButton>
    </form>
  );
}
