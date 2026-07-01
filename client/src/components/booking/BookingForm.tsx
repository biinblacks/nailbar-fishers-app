import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bookingApi, salonApi } from "../../lib/api";
import type { Service } from "../../lib/types";
import { Card } from "../ui/Card";
import { Input, Textarea } from "../ui/Input";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { ServiceSelect } from "./ServiceSelect";
import { DateTimePicker } from "./DateTimePicker";

interface FormState {
  serviceId: string | null;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
}

const INITIAL_STATE: FormState = {
  serviceId: null,
  date: "",
  time: "",
  name: "",
  phone: "",
  email: "",
  notes: "",
};

export function BookingForm() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    salonApi
      .getServices()
      .then(setServices)
      .catch(() => setError("Unable to load services. Please refresh and try again."))
      .finally(() => setLoadingServices(false));
  }, []);

  const isValid =
    form.serviceId && form.date && form.time && form.name.trim() && form.phone.trim().length >= 7;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !form.serviceId) return;

    setSubmitting(true);
    setError(null);
    try {
      const appointment = await bookingApi.create({
        serviceId: form.serviceId,
        date: form.date,
        time: form.time,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
      });
      navigate(`/booking/confirmation/${appointment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <Card>
        <h2 className="text-lg font-serif font-semibold text-blush-900">1. Choose a Service</h2>
        {loadingServices ? (
          <div className="mt-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="mt-4">
            <ServiceSelect
              services={services}
              selectedId={form.serviceId}
              onSelect={(serviceId) => setForm((f) => ({ ...f, serviceId }))}
            />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-serif font-semibold text-blush-900">2. Pick a Date &amp; Time</h2>
        <div className="mt-4">
          <DateTimePicker
            date={form.date}
            time={form.time}
            onDateChange={(date) => setForm((f) => ({ ...f, date }))}
            onTimeChange={(time) => setForm((f) => ({ ...f, time }))}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-serif font-semibold text-blush-900">3. Your Details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            required
          />
          <Input
            label="Email (optional)"
            name="email"
            type="email"
            className="sm:col-span-2"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Textarea
            label="Special Notes (optional)"
            name="notes"
            className="sm:col-span-2"
            placeholder="Preferred technician, nail art ideas, allergies, etc."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </Card>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" disabled={!isValid || submitting} className="w-full">
        {submitting ? <LoadingSpinner className="border-white/40 border-t-white" /> : "Confirm Appointment"}
      </Button>
    </form>
  );
}
