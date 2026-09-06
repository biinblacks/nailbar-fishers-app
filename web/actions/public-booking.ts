"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { headers } from "next/headers";
import { getPublicSalon } from "@/lib/storefront";
import { BookingError, createPublicBooking } from "@/lib/booking";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { dateSchema, phoneSchema, timeSchema, uuidSchema } from "@/lib/validation";
import { fromZodError, optionalStr, str, type ActionState } from "@/lib/action-state";

const schema = z.object({
  serviceId: uuidSchema,
  staffId: uuidSchema.nullable(),
  date: dateSchema,
  time: timeSchema,
  name: z.string().min(2, "Enter your name").max(120),
  phone: phoneSchema,
  email: z.string().email("Enter a valid email").nullable(),
  notes: z.string().max(500).nullable(),
  language: z.enum(["en", "vi"]),
});

/** Public booking form submit (no sign-in). Re-validates availability server-side. */
export async function submitPublicBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const slug = str(formData, "slug");
  const salon = await getPublicSalon(slug);
  if (!salon) return { error: "Salon not found." };

  const ip = clientIp(await headers());
  if (!(await rateLimit(`book:${ip}`, 10, 60_000)).ok) {
    return { error: "Too many booking attempts. Please wait a minute and try again." };
  }

  const parsed = schema.safeParse({
    serviceId: str(formData, "serviceId"),
    staffId: optionalStr(formData, "staffId"),
    date: str(formData, "date"),
    time: str(formData, "time"),
    name: str(formData, "name"),
    phone: str(formData, "phone"),
    email: optionalStr(formData, "email"),
    notes: optionalStr(formData, "notes"),
    language: str(formData, "language") === "vi" ? "vi" : "en",
  });
  if (!parsed.success) return fromZodError(parsed.error);

  let appointmentId: string;
  try {
    const appt = await createPublicBooking(salon, { ...parsed.data, source: "online" });
    appointmentId = appt.id;
  } catch (err) {
    if (err instanceof BookingError) {
      return { error: err.message, fieldErrors: err.code === "unavailable" || err.code === "closed" ? { time: err.message } : undefined };
    }
    return { error: "Something went wrong. Please try again or call the salon." };
  }

  redirect(`/s/${slug}/book/${appointmentId}`);
}
