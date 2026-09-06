"use client";

import { useActionState } from "react";
import { updateSalonProfileAction } from "@/actions/salon";
import { initialActionState } from "@/lib/action-state";
import { TIMEZONES } from "@/lib/validation";
import type { Salon } from "@/lib/types";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SalonProfileForm({ salon, canEdit }: { salon: Salon; canEdit: boolean }) {
  const [state, action] = useActionState(updateSalonProfileAction, initialActionState);
  const fe = state.fieldErrors ?? {};
  const timezones = TIMEZONES.includes(salon.timezone) ? TIMEZONES : [salon.timezone, ...TIMEZONES];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={salon.slug} />
      <fieldset disabled={!canEdit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Salon name" name="name" defaultValue={salon.name} required error={fe.name} />
          <Select label="Timezone" name="timezone" defaultValue={salon.timezone} error={fe.timezone}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
          <Input label="Phone" name="phone" type="tel" defaultValue={salon.phone ?? ""} error={fe.phone} />
          <Input label="Email" name="email" type="email" defaultValue={salon.email ?? ""} error={fe.email} />
          <Input
            label="Address"
            name="address"
            defaultValue={salon.address ?? ""}
            wrapperClassName="sm:col-span-2"
            error={fe.address}
          />
          <Textarea
            label="Parking info"
            name="parking_info"
            defaultValue={salon.parking_info ?? ""}
            wrapperClassName="sm:col-span-2"
            error={fe.parking_info}
          />
          <Input
            label="Google review link"
            name="google_review_link"
            type="url"
            defaultValue={salon.google_review_link ?? ""}
            error={fe.google_review_link}
          />
          <Input
            label="Google Maps link"
            name="google_map_link"
            type="url"
            defaultValue={salon.google_map_link ?? ""}
            error={fe.google_map_link}
          />
          <Input
            label="Instagram"
            name="instagram_link"
            type="url"
            defaultValue={salon.instagram_link ?? ""}
            error={fe.instagram_link}
          />
          <Input
            label="Facebook"
            name="facebook_link"
            type="url"
            defaultValue={salon.facebook_link ?? ""}
            error={fe.facebook_link}
          />
        </div>
        <FormMessage state={state} />
        {canEdit && <SubmitButton>Save profile</SubmitButton>}
      </fieldset>
    </form>
  );
}
