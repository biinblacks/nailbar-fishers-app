"use client";

import { useActionState } from "react";
import { createCampaignAction } from "@/actions/marketing";
import { initialActionState } from "@/lib/action-state";
import { TONES } from "@/lib/marketing/tones";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface Props {
  slug: string;
  services: Array<{ id: string; name: string }>;
  promotions: Array<{ id: string; title: string }>;
}

const PLATFORMS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "sms", label: "SMS blast" },
  { value: "email", label: "Email" },
];

export function CampaignBriefForm({ slug, services, promotions }: Props) {
  const [state, action] = useActionState(createCampaignAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Campaign name" name="name" placeholder="e.g. Fall Gel X launch" required wrapperClassName="sm:col-span-2" error={fe.name} />
        <Textarea
          label="What do you want to achieve?"
          name="goal"
          placeholder="e.g. Fill Tuesday and Wednesday afternoons with gel manicures; mention the new autumn colors."
          required
          wrapperClassName="sm:col-span-2"
          error={fe.goal}
        />
        <Select label="Featured service (optional)" name="focus_service_id" defaultValue="">
          <option value="">Whole salon</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select label="Promotion to push (optional)" name="promotion_id" defaultValue="">
          <option value="">None</option>
          {promotions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </Select>
        <Select label="Tone" name="tone" defaultValue="warm">
          {Object.entries(TONES).map(([k, v]) => (
            <option key={k} value={k}>
              {k[0].toUpperCase() + k.slice(1)} — {v}
            </option>
          ))}
        </Select>
        <div>
          <p className="text-sm font-medium text-blush-800">Languages</p>
          <div className="mt-2 flex gap-4">
            <Checkbox label="English" name="languages" value="en" defaultChecked />
            <Checkbox label="Tiếng Việt" name="languages" value="vi" defaultChecked />
          </div>
          {fe.languages && <p className="mt-1 text-xs text-red-500">{fe.languages}</p>}
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-blush-800">Platforms</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {PLATFORMS.map((p) => (
              <Checkbox key={p.value} label={p.label} name="platforms" value={p.value} defaultChecked={p.value === "facebook" || p.value === "instagram"} />
            ))}
          </div>
          {fe.platforms && <p className="mt-1 text-xs text-red-500">{fe.platforms}</p>}
        </div>
        <Textarea label="Extra notes (optional)" name="brief" placeholder="Colors, vibe, things to avoid, hashtags you always use…" wrapperClassName="sm:col-span-2" error={fe.brief} />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Generating content (10–20 s)…">Generate content pack</SubmitButton>
    </form>
  );
}
