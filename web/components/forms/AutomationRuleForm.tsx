"use client";

import { useActionState } from "react";
import { updateAutomationRuleAction } from "@/actions/automations";
import { initialActionState } from "@/lib/action-state";
import { PLACEHOLDERS } from "@/lib/messaging/templates";
import type { Database } from "@/lib/database.types";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Rule = Database["public"]["Tables"]["automation_rules"]["Row"];

const OFFSET_LABEL: Partial<Record<Rule["type"], string>> = {
  appointment_reminder: "Hours before the appointment",
  review_request: "Hours after the visit is marked completed",
  new_customer_followup: "Hours after the first visit is completed",
};
const INTERVAL_LABEL: Partial<Record<Rule["type"], string>> = {
  comeback_reminder: "Days since last visit",
  birthday_promo: "Days before the birthday (0 = on the day)",
};

export function AutomationRuleForm({ slug, rule, canEdit, smsReady, emailReady }: { slug: string; rule: Rule; canEdit: boolean; smsReady: boolean; emailReady: boolean }) {
  const [state, action] = useActionState(updateAutomationRuleAction, initialActionState);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={rule.id} />
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" name="name" defaultValue={rule.name} required error={fe.name} />
          <Select label="Channel" name="channel" defaultValue={rule.channel} hint={!smsReady && !emailReady ? "No provider configured yet — messages will be logged as skipped" : undefined} error={fe.channel}>
            <option value="sms">SMS{smsReady ? "" : " (not configured)"}</option>
            <option value="email">Email{emailReady ? "" : " (not configured)"}</option>
          </Select>
          {OFFSET_LABEL[rule.type] && (
            <Input label={OFFSET_LABEL[rule.type]!} name="offset_hours" type="number" min={0} step={0.5} defaultValue={rule.offset_minutes / 60} error={fe.offset_minutes} />
          )}
          {INTERVAL_LABEL[rule.type] && (
            <Input label={INTERVAL_LABEL[rule.type]!} name="interval_days" type="number" min={0} defaultValue={rule.interval_days ?? 0} error={fe.interval_days} />
          )}
          <Input label="Send from (hour, 0–23)" name="send_hour_start" type="number" min={0} max={23} defaultValue={rule.send_hour_start} error={fe.send_hour_start} />
          <Input label="Send until (hour, 1–24)" name="send_hour_end" type="number" min={1} max={24} defaultValue={rule.send_hour_end} hint="Messages outside this window wait until it opens" error={fe.send_hour_end} />
          <Textarea label="Message (English)" name="template_en" defaultValue={rule.template_en} wrapperClassName="sm:col-span-2" error={fe.template_en} />
          <Textarea label="Message (Tiếng Việt)" name="template_vi" defaultValue={rule.template_vi} wrapperClassName="sm:col-span-2" error={fe.template_vi} />
        </div>
        <details className="text-xs text-blush-800/70">
          <summary className="cursor-pointer text-blush-500">Placeholders you can use</summary>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {PLACEHOLDERS.map((p) => (
              <li key={p.key}>
                <code className="rounded bg-blush-50 px-1">{`{{${p.key}}}`}</code> {p.description}
              </li>
            ))}
          </ul>
        </details>
        <div className="flex flex-wrap items-center gap-4">
          <Checkbox label="Enabled" name="is_enabled" defaultChecked={rule.is_enabled} />
          {canEdit && <SubmitButton variant="secondary">Save</SubmitButton>}
        </div>
        <FormMessage state={state} />
      </fieldset>
    </form>
  );
}
