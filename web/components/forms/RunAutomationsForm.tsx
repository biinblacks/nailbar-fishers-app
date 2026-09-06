"use client";

import { useActionState } from "react";
import { runAutomationsNowAction } from "@/actions/automations";
import { initialActionState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function RunAutomationsForm({ slug }: { slug: string }) {
  const [state, action] = useActionState(runAutomationsNowAction, initialActionState);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <SubmitButton pendingText="Running…">Run automations now</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
