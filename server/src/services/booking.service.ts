import { supabase } from "../config/supabase.js";
import { ApiError } from "../middleware/error.middleware.js";
import type { Appointment } from "../types/index.js";

export interface CreateBookingInput {
  serviceId: string;
  staffId?: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}

async function upsertCustomer(salonId: string, input: CreateBookingInput): Promise<string> {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
    .eq("salon_id", salonId)
    .eq("phone", input.phone)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("customers")
      .update({ full_name: input.name, email: input.email ?? null })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data: created, error } = await supabase
    .from("customers")
    .insert({
      salon_id: salonId,
      full_name: input.name,
      phone: input.phone,
      email: input.email ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    throw new ApiError(500, `Failed to save customer: ${error?.message}`);
  }
  return created.id as string;
}

export async function createBooking(
  salonId: string,
  input: CreateBookingInput
): Promise<Appointment> {
  const { data: service } = await supabase
    .from("services")
    .select("id, duration_minutes")
    .eq("id", input.serviceId)
    .eq("salon_id", salonId)
    .eq("is_active", true)
    .maybeSingle();

  if (!service) {
    throw new ApiError(400, "Selected service is not available");
  }

  if (input.staffId) {
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("id", input.staffId)
      .eq("salon_id", salonId)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) throw new ApiError(400, "Selected technician is not available");
  }

  const customerId = await upsertCustomer(salonId, input);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      salon_id: salonId,
      customer_id: customerId,
      service_id: input.serviceId,
      staff_id: input.staffId ?? null,
      customer_name: input.name,
      customer_phone: input.phone,
      customer_email: input.email ?? null,
      appointment_date: input.date,
      appointment_time: input.time,
      duration_minutes: service.duration_minutes,
      notes: input.notes ?? null,
      status: "pending",
      source: "online",
    })
    .select("*")
    .single();

  if (error || !appointment) {
    throw new ApiError(500, `Failed to create appointment: ${error?.message}`);
  }

  return appointment as Appointment;
}

export async function getAppointmentById(salonId: string, id: string): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, services(name, price_cents, price_label), staff(full_name)")
    .eq("id", id)
    .eq("salon_id", salonId)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(404, "Appointment not found");
  }
  return data as unknown as Appointment;
}
