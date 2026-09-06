"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/actions/auth";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      <Input label="Email" name="email" type="email" autoComplete="email" required error={state.fieldErrors?.email} />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Signing in…">
        Sign in
      </SubmitButton>
      <p className="text-center text-xs text-blush-800/70">
        <Link href="/forgot-password" className="text-blush-500 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </form>
  );
}
