"use client";

import { useActionState } from "react";
import { saveReceptionistSettingsAction } from "@/actions/receptionist";
import { initialActionState } from "@/lib/action-state";
import type { PublicSalon } from "@/lib/storefront";
import { Checkbox, Input, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ReceptionistSettingsForm({ salon, canEdit }: { salon: PublicSalon; canEdit: boolean }) {
  const [state, action] = useActionState(saveReceptionistSettingsAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={salon.slug} />
      <fieldset disabled={!canEdit} className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blush-800/60">AI receptionist</h3>
          <Checkbox label="Enable the AI receptionist on the storefront and embed" name="ai_enabled" defaultChecked={salon.ai_enabled} />
          <Checkbox label="Allow the AI to book appointments (creates pending requests)" name="ai_can_book" defaultChecked={salon.ai_can_book} />
          <Textarea
            label="Welcome message (optional)"
            name="ai_greeting"
            defaultValue={salon.ai_greeting ?? ""}
            placeholder={`Hi there! I'm the ${salon.name} virtual receptionist…`}
            error={fe.ai_greeting}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blush-800/60">Text messaging</h3>
          <Input
            label="Your salon's SMS number (optional)"
            name="sms_number"
            type="tel"
            defaultValue={salon.sms_number ?? ""}
            placeholder="+13175550182"
            hint="The Twilio number guests text. Incoming texts land in your Inbox."
            error={fe.sms_number}
          />
          <Checkbox label="Let the AI answer incoming texts automatically" name="sms_ai_autoreply" defaultChecked={salon.sms_ai_autoreply} />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-blush-800/60">Online booking rules</h3>
          <Checkbox label="Accept online bookings" name="online_booking_enabled" defaultChecked={salon.online_booking_enabled} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Time slot interval (minutes)" name="booking_slot_minutes" type="number" min={5} max={120} step={5} defaultValue={salon.booking_slot_minutes} error={fe.booking_slot_minutes} />
            <Input label="Minimum notice (minutes)" name="booking_lead_minutes" type="number" min={0} max={10080} step={15} defaultValue={salon.booking_lead_minutes} hint="How far ahead guests must book" error={fe.booking_lead_minutes} />
            <Input label="Booking window (days)" name="booking_window_days" type="number" min={1} max={365} defaultValue={salon.booking_window_days} error={fe.booking_window_days} />
            <Input label="Buffer between appointments (minutes)" name="booking_buffer_minutes" type="number" min={0} max={120} step={5} defaultValue={salon.booking_buffer_minutes} error={fe.booking_buffer_minutes} />
          </div>
        </div>

        <FormMessage state={state} />
        {canEdit && <SubmitButton>Save settings</SubmitButton>}
      </fieldset>
    </form>
  );
}
