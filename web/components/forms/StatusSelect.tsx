"use client";

import { useRef, useTransition } from "react";
import { setAppointmentStatusAction } from "@/actions/appointments";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/lib/types";
import { STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";

interface Props {
  slug: string;
  id: string;
  status: AppointmentStatus;
}

/** Inline status dropdown that submits on change (used in list views). */
export function StatusSelect({ slug, id, status }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={(fd) => startTransition(() => setAppointmentStatusAction(fd))}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        disabled={pending}
        aria-label="Appointment status"
        onChange={() => formRef.current?.requestSubmit()}
        className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]} disabled:opacity-50`}
      >
        {APPOINTMENT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
