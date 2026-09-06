"use client";

import { useActionState, useState } from "react";
import { createSalonAction } from "@/actions/salon";
import { initialActionState } from "@/lib/action-state";
import { slugify } from "@/lib/format";
import { TIMEZONES } from "@/lib/validation";
import { Input, Select } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function CreateSalonForm() {
  const [state, action] = useActionState(createSalonAction, initialActionState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const effectiveSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={action} className="space-y-4">
      <Input
        label="Salon name"
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Nail Bar Fishers"
        required
        error={state.fieldErrors?.name}
      />
      <Input
        label="Salon URL"
        name="slug"
        value={effectiveSlug}
        onChange={(e) => {
          setSlugTouched(true);
          setSlug(slugify(e.target.value));
        }}
        hint={`Your dashboard lives at /app/${effectiveSlug || "your-salon"}`}
        required
        error={state.fieldErrors?.slug}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Phone (optional)" name="phone" type="tel" autoComplete="tel" error={state.fieldErrors?.phone} />
        <Select label="Timezone" name="timezone" defaultValue="America/Indiana/Indianapolis">
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>
      <Input label="Address (optional)" name="address" autoComplete="street-address" error={state.fieldErrors?.address} />
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Creating salon…">
        Create salon
      </SubmitButton>
    </form>
  );
}
