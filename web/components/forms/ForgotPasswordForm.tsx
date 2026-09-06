"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <Input label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
