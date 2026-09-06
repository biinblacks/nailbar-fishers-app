"use client";

import { useActionState } from "react";
import { openBillingPortalAction, startCheckoutAction } from "@/actions/billing";
import { initialActionState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function CheckoutButton({ slug, plan, label, disabled }: { slug: string; plan: string; label: string; disabled?: boolean }) {
  const [state, action] = useActionState(startCheckoutAction, initialActionState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="plan" value={plan} />
      {disabled ? (
        <button type="button" disabled className="btn-secondary w-full opacity-60">
          {label}
        </button>
      ) : (
        <SubmitButton className="w-full" pendingText="Opening checkout…">
          {label}
        </SubmitButton>
      )}
      <FormMessage state={state} />
    </form>
  );
}

export function PortalButton({ slug }: { slug: string }) {
  const [state, action] = useActionState(openBillingPortalAction, initialActionState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <SubmitButton variant="secondary" pendingText="Opening…">
        Manage billing &amp; invoices
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
