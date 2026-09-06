"use client";

import { useActionState, useEffect, useRef } from "react";
import { replyToConversationAction } from "@/actions/inbox";
import { initialActionState } from "@/lib/action-state";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ConversationReplyForm({ slug, id, to, smsReady }: { slug: string; id: string; to: string | null; smsReady: boolean }) {
  const [state, action] = useActionState(replyToConversationAction, initialActionState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state.success]);

  if (!to) {
    return <p className="text-sm text-blush-800/60">This guest chatted on the website, so there is no number to text back. Their contact details appear once they book.</p>;
  }

  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-col gap-1.5 text-sm font-medium text-blush-800">
        Reply by text to {to}
        <textarea name="text" className="input-field min-h-[80px]" maxLength={1000} placeholder="Type your reply…" required disabled={!smsReady} />
      </label>
      {!smsReady && <p className="text-xs text-gold-700">Add your Twilio credentials to send texts from here.</p>}
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…">Send text</SubmitButton>
    </form>
  );
}
