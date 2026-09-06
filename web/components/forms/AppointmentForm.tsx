"use client";

import { useActionState, useState } from "react";
import { createAppointmentAction, updateAppointmentAction } from "@/actions/appointments";
import { initialActionState } from "@/lib/action-state";
import { APPOINTMENT_STATUSES, type Appointment, type Customer, type Service, type Staff } from "@/lib/types";
import { STATUS_LABELS, formatPrice } from "@/lib/format";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface Props {
  slug: string;
  services: Service[];
  staff: Staff[];
  customers: Pick<Customer, "id" | "full_name" | "phone" | "email">[];
  appointment?: Appointment;
  defaults?: { date?: string; time?: string; customerId?: string };
}

const SOURCES: Array<{ value: string; label: string }> = [
  { value: "manual", label: "Front desk" },
  { value: "phone", label: "Phone call" },
  { value: "walk_in", label: "Walk-in" },
  { value: "online", label: "Online booking" },
  { value: "ai", label: "AI receptionist" },
];

export function AppointmentForm({ slug, services, staff, customers, appointment, defaults }: Props) {
  const [state, action] = useActionState(
    appointment ? updateAppointmentAction : createAppointmentAction,
    initialActionState
  );
  const fe = state.fieldErrors ?? {};

  const initialCustomer =
    customers.find((c) => c.id === (appointment?.customer_id ?? defaults?.customerId)) ?? null;
  const [customerId, setCustomerId] = useState(initialCustomer?.id ?? "");
  const [name, setName] = useState(appointment?.customer_name ?? initialCustomer?.full_name ?? "");
  const [phone, setPhone] = useState(appointment?.customer_phone ?? initialCustomer?.phone ?? "");
  const [email, setEmail] = useState(appointment?.customer_email ?? initialCustomer?.email ?? "");
  const [serviceId, setServiceId] = useState(appointment?.service_id ?? services[0]?.id ?? "");

  const selectedService = services.find((s) => s.id === serviceId);

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setName(c.full_name);
      setPhone(c.phone);
      setEmail(c.email ?? "");
    }
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      {appointment && <input type="hidden" name="id" value={appointment.id} />}
      <input type="hidden" name="customer_id" value={customerId} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-blush-900">Customer</h2>
        <Select
          label="Existing customer"
          name="_customer_picker"
          value={customerId}
          onChange={(e) => pickCustomer(e.target.value)}
          hint="Pick a customer or type a new one below. New customers are saved automatically."
        >
          <option value="">New customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name} · {c.phone}
            </option>
          ))}
        </Select>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Name"
            name="customer_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            error={fe.customer_name}
          />
          <Input
            label="Phone"
            name="customer_phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            error={fe.customer_phone}
          />
          <Input
            label="Email (optional)"
            name="customer_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fe.customer_email}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-blush-900">Service &amp; time</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Service"
            name="service_id"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            required
            error={fe.service_id}
          >
            {services.length === 0 && <option value="">Add a service first</option>}
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatPrice(s.price_cents, s.price_label)} · {s.duration_minutes} min
              </option>
            ))}
          </Select>
          <Select label="Technician" name="staff_id" defaultValue={appointment?.staff_id ?? ""} error={fe.staff_id}>
            <option value="">Any available</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </Select>
          <Input
            label="Date"
            name="appointment_date"
            type="date"
            defaultValue={appointment?.appointment_date ?? defaults?.date ?? ""}
            required
            error={fe.appointment_date}
          />
          <Input
            label="Time"
            name="appointment_time"
            type="time"
            step={900}
            defaultValue={appointment?.appointment_time?.slice(0, 5) ?? defaults?.time ?? "10:00"}
            required
            error={fe.appointment_time}
          />
          <Input
            label="Duration (minutes)"
            name="duration_minutes"
            type="number"
            min="5"
            step="5"
            key={selectedService?.id ?? "none"}
            defaultValue={appointment?.duration_minutes ?? selectedService?.duration_minutes ?? 30}
            hint="Defaults to the service duration"
            error={fe.duration_minutes}
          />
          <Select label="Status" name="status" defaultValue={appointment?.status ?? "confirmed"} error={fe.status}>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select label="Booked via" name="source" defaultValue={appointment?.source ?? "manual"} error={fe.source}>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Textarea
            label="Notes (optional)"
            name="notes"
            defaultValue={appointment?.notes ?? ""}
            wrapperClassName="sm:col-span-2"
            placeholder="Nail art ideas, allergies, special requests…"
            error={fe.notes}
          />
        </div>
      </section>

      <FormMessage state={state} />
      <SubmitButton>{appointment ? "Save appointment" : "Book appointment"}</SubmitButton>
    </form>
  );
}
