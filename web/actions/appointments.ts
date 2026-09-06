"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { appointmentSchema } from "@/lib/validation";
import { timeToMinutes } from "@/lib/format";
import {
  friendlyDbError,
  fromZodError,
  num,
  optionalStr,
  str,
  type ActionState,
} from "@/lib/action-state";
import type { AppointmentStatus } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function parseAppointment(formData: FormData) {
  return appointmentSchema.safeParse({
    customer_id: optionalStr(formData, "customer_id"),
    customer_name: str(formData, "customer_name"),
    customer_phone: str(formData, "customer_phone"),
    customer_email: optionalStr(formData, "customer_email"),
    service_id: str(formData, "service_id"),
    staff_id: optionalStr(formData, "staff_id"),
    appointment_date: str(formData, "appointment_date"),
    appointment_time: str(formData, "appointment_time"),
    duration_minutes: num(formData, "duration_minutes") ?? null,
    status: str(formData, "status") || "confirmed",
    source: str(formData, "source") || "manual",
    notes: optionalStr(formData, "notes"),
  });
}

/**
 * Find-or-create the customer record by phone so every booking is linked to
 * a customer row (needed for history, reminders and marketing later).
 */
async function resolveCustomer(
  supabase: SupabaseClient,
  salonId: string,
  input: { customer_id: string | null; customer_name: string; customer_phone: string; customer_email: string | null }
): Promise<string> {
  if (input.customer_id) {
    const { data } = await supabase
      .from("customers")
      .select("id")
      .eq("id", input.customer_id)
      .eq("salon_id", salonId)
      .maybeSingle();
    if (data) return data.id as string;
  }

  const { data: byPhone } = await supabase
    .from("customers")
    .select("id")
    .eq("salon_id", salonId)
    .eq("phone", input.customer_phone)
    .maybeSingle();
  if (byPhone) return byPhone.id as string;

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      salon_id: salonId,
      full_name: input.customer_name,
      phone: input.customer_phone,
      email: input.customer_email,
    })
    .select("id")
    .single();
  if (error) throw new Error(friendlyDbError(error.message));
  return created.id as string;
}

/** Returns an error string when the technician is already booked in that window. */
async function findStaffConflict(
  supabase: SupabaseClient,
  salonId: string,
  staffId: string,
  date: string,
  time: string,
  duration: number,
  excludeId?: string
): Promise<string | null> {
  const { data } = await supabase
    .from("appointments")
    .select("id, appointment_time, duration_minutes, customer_name, services(duration_minutes)")
    .eq("salon_id", salonId)
    .eq("staff_id", staffId)
    .eq("appointment_date", date)
    .in("status", ["pending", "confirmed"]);

  const start = timeToMinutes(time);
  const end = start + duration;

  for (const row of data ?? []) {
    if (excludeId && row.id === excludeId) continue;
    const service = row.services as unknown as { duration_minutes: number } | null;
    const otherDuration = row.duration_minutes ?? service?.duration_minutes ?? 30;
    const otherStart = timeToMinutes(row.appointment_time as string);
    const otherEnd = otherStart + otherDuration;
    if (start < otherEnd && otherStart < end) {
      return `That technician already has ${row.customer_name} booked at that time.`;
    }
  }
  return null;
}

export async function createAppointmentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const slug = str(formData, "slug");
  const { salon, userId } = await requireSalonAccess(slug);
  const parsed = parseAppointment(formData);
  if (!parsed.success) return fromZodError(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("id, duration_minutes")
    .eq("id", input.service_id)
    .eq("salon_id", salon.id)
    .maybeSingle();
  if (!service) return { error: "Pick a valid service.", fieldErrors: { service_id: "Required" } };

  const duration = input.duration_minutes ?? (service.duration_minutes as number);

  if (input.staff_id) {
    const conflict = await findStaffConflict(
      supabase,
      salon.id,
      input.staff_id,
      input.appointment_date,
      input.appointment_time,
      duration
    );
    if (conflict) return { error: conflict, fieldErrors: { appointment_time: "Time conflict" } };
  }

  let customerId: string;
  try {
    customerId = await resolveCustomer(supabase, salon.id, input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save customer." };
  }

  const { data: created, error } = await supabase
    .from("appointments")
    .insert({
      salon_id: salon.id,
      customer_id: customerId,
      service_id: input.service_id,
      staff_id: input.staff_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      duration_minutes: duration,
      status: input.status,
      source: input.source,
      notes: input.notes,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) return { error: friendlyDbError(error.message) };

  revalidatePath(`/app/${slug}`, "layout");
  redirect(`/app/${slug}/appointments/${created.id}`);
}

export async function updateAppointmentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);
  const parsed = parseAppointment(formData);
  if (!parsed.success) return fromZodError(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("id, duration_minutes")
    .eq("id", input.service_id)
    .eq("salon_id", salon.id)
    .maybeSingle();
  if (!service) return { error: "Pick a valid service.", fieldErrors: { service_id: "Required" } };
  const duration = input.duration_minutes ?? (service.duration_minutes as number);

  if (input.staff_id && input.status !== "cancelled" && input.status !== "no_show") {
    const conflict = await findStaffConflict(
      supabase,
      salon.id,
      input.staff_id,
      input.appointment_date,
      input.appointment_time,
      duration,
      id
    );
    if (conflict) return { error: conflict, fieldErrors: { appointment_time: "Time conflict" } };
  }

  let customerId: string;
  try {
    customerId = await resolveCustomer(supabase, salon.id, input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save customer." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      customer_id: customerId,
      service_id: input.service_id,
      staff_id: input.staff_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      customer_email: input.customer_email,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      duration_minutes: duration,
      status: input.status,
      source: input.source,
      notes: input.notes,
      review_requested: input.status === "completed",
    })
    .eq("id", id)
    .eq("salon_id", salon.id);
  if (error) return { error: friendlyDbError(error.message) };

  if (input.status === "completed") {
    await supabase
      .from("customers")
      .update({ last_visit_at: new Date().toISOString() })
      .eq("id", customerId)
      .eq("salon_id", salon.id);
  }

  revalidatePath(`/app/${slug}`, "layout");
  return { success: "Appointment saved." };
}

/** Quick status change from the list view (no full form). */
export async function setAppointmentStatusAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const status = str(formData, "status") as AppointmentStatus;
  const { salon } = await requireSalonAccess(slug);
  if (!["pending", "confirmed", "completed", "cancelled", "no_show"].includes(status)) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .update({ status, review_requested: status === "completed" })
    .eq("id", id)
    .eq("salon_id", salon.id)
    .select("customer_id")
    .maybeSingle();

  if (status === "completed" && data?.customer_id) {
    await supabase
      .from("customers")
      .update({ last_visit_at: new Date().toISOString() })
      .eq("id", data.customer_id)
      .eq("salon_id", salon.id);
  }

  revalidatePath(`/app/${slug}`, "layout");
}

export async function deleteAppointmentAction(formData: FormData): Promise<void> {
  const slug = str(formData, "slug");
  const id = str(formData, "id");
  const { salon } = await requireSalonAccess(slug);

  const supabase = await createClient();
  await supabase.from("appointments").delete().eq("id", id).eq("salon_id", salon.id);
  revalidatePath(`/app/${slug}`, "layout");
  redirect(`/app/${slug}/appointments`);
}
