"use client";

import { useActionState, useState } from "react";
import { saveBusinessHoursAction } from "@/actions/salon";
import { initialActionState } from "@/lib/action-state";
import { DAY_NAMES } from "@/lib/format";
import type { BusinessHour } from "@/lib/types";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface Props {
  slug: string;
  hours: BusinessHour[];
  canEdit: boolean;
}

export function HoursForm({ slug, hours, canEdit }: Props) {
  const [state, action] = useActionState(saveBusinessHoursAction, initialActionState);
  const [closed, setClosed] = useState<boolean[]>(() =>
    Array.from({ length: 7 }, (_, d) => hours.find((h) => h.day_of_week === d)?.is_closed ?? d === 0)
  );

  const rows = Array.from({ length: 7 }, (_, d) => {
    const h = hours.find((x) => x.day_of_week === d);
    return {
      day: d,
      open: h?.open_time?.slice(0, 5) ?? "09:30",
      close: h?.close_time?.slice(0, 5) ?? "19:00",
    };
  });

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <fieldset disabled={!canEdit} className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.day}
            className="grid grid-cols-2 items-center gap-3 rounded-2xl border border-blush-50 bg-white p-3 sm:grid-cols-[1fr_auto_1fr_1fr]"
          >
            <span className="font-medium text-blush-900">{DAY_NAMES[row.day]}</span>
            <label className="flex items-center gap-2 text-sm text-blush-800">
              <input
                type="checkbox"
                name={`closed_${row.day}`}
                checked={closed[row.day]}
                onChange={(e) =>
                  setClosed((prev) => prev.map((c, i) => (i === row.day ? e.target.checked : c)))
                }
                className="h-4 w-4 rounded border-blush-200 text-blush-500"
              />
              Closed
            </label>
            <input
              type="time"
              name={`open_${row.day}`}
              defaultValue={row.open}
              disabled={closed[row.day] || !canEdit}
              aria-label={`${DAY_NAMES[row.day]} opening time`}
              className="input-field disabled:opacity-40"
            />
            <input
              type="time"
              name={`close_${row.day}`}
              defaultValue={row.close}
              disabled={closed[row.day] || !canEdit}
              aria-label={`${DAY_NAMES[row.day]} closing time`}
              className="input-field disabled:opacity-40"
            />
          </div>
        ))}
      </fieldset>
      <FormMessage state={state} />
      {canEdit && <SubmitButton>Save hours</SubmitButton>}
    </form>
  );
}
