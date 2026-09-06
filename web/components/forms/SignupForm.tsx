"use client";

import { useActionState } from "react";
import { signUpAction } from "@/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SignupForm() {
  const [state, action] = useActionState(signUpAction, initialActionState);

  if (state.success) {
    return <FormMessage state={state} />;
  }

  return (
    <form action={action} className="space-y-4">
      <Input label="Your name" name="full_name" autoComplete="name" required error={state.fieldErrors?.full_name} />
      <Input label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        hint="At least 8 characters"
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
