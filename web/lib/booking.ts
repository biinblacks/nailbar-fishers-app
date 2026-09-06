import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeSlots, type BookingRules, type BusyBlock, type HoursRow } from "@/lib/availability";
import type { Appointment, Staff } from "@/lib/types";
import type { PublicSalon } from "@/lib/storefront";

export class BookingError extends Error {
  code: "service" | "staff" | "closed" | "unavailable" | "disabled" | "invalid";
  constructor(code: BookingError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export function rulesFor(salon: PublicSalon): BookingRules {
  return {
    timezone: salon.timezone,
    booking_slot_minutes: salon.booking_slot_minutes ?? 30,
    booking_lead_minutes: salon.booking_lead_minutes ?? 60,
    booking_window_days: salon.booking_window_days ?? 60,
    booking_buffer_minutes: salon.booking_buffer_minutes ?? 0,
  };
}

/** Loads what the availability engine needs for one day. */
export async function loadDayContext(salonId: string, date: string) {
  const db = createAdminClient();
  const [staffRes, hoursRes, busyRes] = await Promise.all([
    db.from("staff").select("id, full_name").eq("salon_id", salonId).eq("is_active", true).order("display_order"),
    db.from("business_hours").select("day_of_week, open_time, close_time, is_closed").eq("salon_id", salonId),
    db
      .from("appointments")
      .select("staff_id, appointment_time, duration_minutes, services(duration_minutes)")
      .eq("salon_id", salonId)
      .eq("appointment_date", date)
      .in("status", ["pending", "confirmed"]),
  ]);

  const busy: BusyBlock[] = (busyRes.data ?? []).map((row) => {
    const service = row.services as unknown as { duration_minutes: number } | null;
    return {
      staff_id: (row.staff_id as string | null) ?? null,
      appointment_time: row.appointment_time as string,
      duration_minutes: (row.duration_minutes as number | null) ?? service?.duration_minutes ?? 30,
    };
  });

  return {
    staff: (staffRes.data ?? []) as Pick<Staff, "id" | "full_name">[],
    hours: (hoursRes.data ?? []) as HoursRow[],
    busy,
  };
}

export interface PublicBookingInput {
  serviceId: string;
  staffId?: string | null;
  date: string;
  time: string; // HH:MM
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  source: "online" | "ai";
  conversationId?: string | null;
  language?: "en" | "vi";
}

/**
 * Creates a pending appointment for an anonymous visitor after re-checking
 * availability server-side. Used by the public booking form and the AI tool.
 */
export async function createPublicBooking(salon: PublicSalon, input: PublicBookingInput): Promise<Appointment> {
  if (!salon.online_booking_enabled) {
    throw new BookingError("disabled", "Online booking is currently turned off. Please call the salon.");
  }
  const db = createAdminClient();

  const { data: service } = await db
    .from("services")
    .select("id, name, duration_minutes")
    .eq("id", input.serviceId)
    .eq("salon_id", salon.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!service) throw new BookingError("service", "That service is not available for online booking.");

  const day = await loadDayContext(salon.id, input.date);
  if (input.staffId && !day.staff.some((s) => s.id === input.staffId)) {
    throw new BookingError("staff", "That technician is not available for online booking.");
  }

  const { slots, reason } = computeSlots({
    date: input.date,
    durationMinutes: service.duration_minutes as number,
    staffId: input.staffId ?? null,
    activeStaffIds: day.staff.map((s) => s.id),
    hours: day.hours,
    busy: day.busy,
    rules: rulesFor(salon),
  });
  const slot = slots.find((s) => s.time === input.time.slice(0, 5));
  if (!slot) {
    if (reason === "closed") throw new BookingError("closed", "The salon is closed on that day.");
    throw new BookingError("unavailable", "That time is no longer available. Please pick another slot.");
  }

  // Auto-assign a free technician when the guest has no preference.
  const staffId = input.staffId ?? slot.freeStaffIds[0] ?? null;

  const phone = input.phone.trim();
  const { data: existing } = await db
    .from("customers")
    .select("id")
    .eq("salon_id", salon.id)
    .eq("phone", phone)
    .maybeSingle();

  let customerId: string;
  if (existing) {
    customerId = existing.id as string;
    await db
      .from("customers")
      .update({ full_name: input.name.trim(), ...(input.email ? { email: input.email } : {}) })
      .eq("id", customerId);
  } else {
    const { data: created, error } = await db
      .from("customers")
      .insert({
        salon_id: salon.id,
        full_name: input.name.trim(),
        phone,
        email: input.email ?? null,
        preferred_language: input.language ?? "en",
      })
      .select("id")
      .single();
    if (error || !created) throw new BookingError("invalid", "Could not save your details. Please try again.");
    customerId = created.id as string;
  }

  const { data: appointment, error } = await db
    .from("appointments")
    .insert({
      salon_id: salon.id,
      customer_id: customerId,
      service_id: service.id,
      staff_id: staffId,
      customer_name: input.name.trim(),
      customer_phone: phone,
      customer_email: input.email ?? null,
      appointment_date: input.date,
      appointment_time: input.time.slice(0, 5),
      duration_minutes: service.duration_minutes,
      notes: input.notes ?? null,
      status: "pending",
      source: input.source,
      conversation_id: input.conversationId ?? null,
    })
    .select("*, services(name, price_cents, price_label, duration_minutes), staff(full_name, color)")
    .single();
  if (error || !appointment) throw new BookingError("invalid", "Could not create the appointment. Please try again.");

  if (input.conversationId) {
    await db
      .from("chat_conversations")
      .update({ customer_id: customerId, customer_name: input.name.trim(), customer_phone: phone })
      .eq("id", input.conversationId);
  }

  return appointment as Appointment;
}

/** Public lookup for the confirmation page: id is an unguessable uuid, slug must match. */
export async function getPublicAppointment(salonId: string, id: string): Promise<Appointment | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await createAdminClient()
    .from("appointments")
    .select("*, services(name, price_cents, price_label, duration_minutes), staff(full_name, color)")
    .eq("id", id)
    .eq("salon_id", salonId)
    .maybeSingle();
  return (data as Appointment | null) ?? null;
}
