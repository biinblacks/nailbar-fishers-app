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

async function upsertCustomer(input: CreateBookingInput): Promise<string> {
  const { data: existing } = await supabase
    .from("customers")
    .select("id")
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
    .insert({ full_name: input.name, phone: input.phone, email: input.email ?? null })
    .select("id")
    .single();

  if (error || !created) {
    throw new ApiError(500, `Failed to save customer: ${error?.message}`);
  }
  return created.id as string;
}

export async function createBooking(input: CreateBookingInput): Promise<Appointment> {
  const { data: service } = await supabase
    .from("services")
    .select("id")
    .eq("id", input.serviceId)
    .eq("is_active", true)
    .maybeSingle();

  if (!service) {
    throw new ApiError(400, "Selected service is not available");
  }

  const customerId = await upsertCustomer(input);

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      customer_id: customerId,
      service_id: input.serviceId,
      staff_id: input.staffId ?? null,
      customer_name: input.name,
      customer_phone: input.phone,
      customer_email: input.email ?? null,
      appointment_date: input.date,
      appointment_time: input.time,
      notes: input.notes ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !appointment) {
    throw new ApiError(500, `Failed to create appointment: ${error?.message}`);
  }

  return appointment as Appointment;
}

export async function getAppointmentById(id: string): Promise<Appointment> {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, services(name, price_cents, price_label), staff(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    throw new ApiError(404, "Appointment not found");
  }
  return data as unknown as Appointment;
}
