"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { submitPublicBookingAction } from "@/actions/public-booking";
import { initialActionState } from "@/lib/action-state";
import { formatDate, formatPrice, DAY_NAMES } from "@/lib/format";
import type { BusinessHour, Service, ServiceCategory, Staff } from "@/lib/types";
import { Input, Textarea } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  slug: string;
  services: Service[];
  categories: ServiceCategory[];
  staff: Staff[];
  hours: BusinessHour[];
  dates: string[]; // next N days in the salon timezone
}

interface SlotDto {
  time: string;
  label: string;
  staffIds: string[];
}

export function BookingWizard({ slug, services, categories, staff, hours, dates }: Props) {
  const [state, action] = useActionState(submitPublicBookingAction, initialActionState);
  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [date, setDate] = useState<string>(dates[0] ?? "");
  const [time, setTime] = useState<string>("");
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [slotsReason, setSlotsReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [language, setLanguage] = useState<"en" | "vi">("en");
  const fe = state.fieldErrors ?? {};

  const service = services.find((s) => s.id === serviceId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.service_categories?.name ?? "Other";
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    const order = [...categories.map((c) => c.name), "Other"];
    return order.filter((k) => map.has(k)).map((k) => [k, map.get(k)!] as const);
  }, [services, categories]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("vi")) setLanguage("vi");
  }, []);

  const closedDays = useMemo(() => new Set(hours.filter((h) => h.is_closed).map((h) => h.day_of_week)), [hours]);

  useEffect(() => {
    setTime("");
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    setLoadingSlots(true);
    const q = new URLSearchParams({ date, service: serviceId, ...(staffId ? { staff: staffId } : {}) });
    fetch(`/api/salons/${slug}/availability?${q}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((body: { slots?: SlotDto[]; reason?: string | null }) => {
        setSlots(body.slots ?? []);
        setSlotsReason(body.reason ?? null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [slug, serviceId, staffId, date]);

  const reasonText: Record<string, string> = {
    closed: "The salon is closed on this day.",
    past: "That day has already passed.",
    outside_window: "That date is too far ahead for online booking.",
    full: "No openings left on this day. Try another date or technician.",
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      <input type="hidden" name="language" value={language} />

      <section className="glass-card p-6">
        <h2 className="text-lg font-semibold text-blush-900">1. Choose a service</h2>
        {fe.serviceId && <p className="mt-1 text-xs text-red-500">{fe.serviceId}</p>}
        <div className="mt-4 space-y-5">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blush-800/60">{cat}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((s) => {
                  const active = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      aria-pressed={active}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active ? "border-blush-400 bg-blush-50 shadow-soft" : "border-blush-100 bg-white hover:border-blush-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-blush-900">{s.name}</span>
                        <span className="whitespace-nowrap text-sm font-semibold text-gold-600">{formatPrice(s.price_cents, s.price_label)}</span>
                      </div>
                      <p className="mt-1 text-xs text-blush-800/60">{s.duration_minutes} min</p>
                      {s.description && <p className="mt-1 line-clamp-2 text-xs text-blush-800/70">{s.description}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {services.length === 0 && <p className="text-sm text-blush-800/60">Online booking is not set up yet. Please call the salon.</p>}
        </div>
      </section>

      {staff.length > 0 && (
        <section className="glass-card p-6">
          <h2 className="text-lg font-semibold text-blush-900">2. Pick a technician (optional)</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStaffId("")}
              aria-pressed={staffId === ""}
              className={`rounded-full border px-4 py-2 text-sm transition ${staffId === "" ? "border-blush-400 bg-blush-500 text-white" : "border-blush-100 bg-white text-blush-800 hover:border-blush-300"}`}
            >
              Any available
            </button>
            {staff.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setStaffId(m.id)}
                aria-pressed={staffId === m.id}
                className={`rounded-full border px-4 py-2 text-sm transition ${staffId === m.id ? "border-blush-400 bg-blush-500 text-white" : "border-blush-100 bg-white text-blush-800 hover:border-blush-300"}`}
              >
                {m.full_name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="glass-card p-6">
        <h2 className="text-lg font-semibold text-blush-900">{staff.length > 0 ? "3" : "2"}. Pick a date &amp; time</h2>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => {
            const dow = new Date(`${d}T00:00:00`).getDay();
            const closed = closedDays.has(dow);
            const active = d === date;
            return (
              <button
                key={d}
                type="button"
                disabled={closed}
                onClick={() => setDate(d)}
                aria-pressed={active}
                className={`flex min-w-[72px] flex-col items-center rounded-2xl border px-3 py-2 text-xs transition ${
                  active ? "border-blush-400 bg-blush-500 text-white" : closed ? "border-blush-50 bg-blush-50/50 text-blush-300" : "border-blush-100 bg-white text-blush-800 hover:border-blush-300"
                }`}
              >
                <span className="font-semibold">{DAY_NAMES[dow].slice(0, 3)}</span>
                <span className="text-base font-bold">{Number(d.slice(8, 10))}</span>
                <span>{formatDate(d, { month: "short", weekday: undefined, day: undefined, year: undefined })}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {!serviceId ? (
            <p className="text-sm text-blush-800/60">Choose a service to see available times.</p>
          ) : loadingSlots ? (
            <div className="flex items-center gap-2 text-sm text-blush-800/60">
              <Spinner /> Checking availability…
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-blush-800/60">{reasonText[slotsReason ?? "full"] ?? "No openings on this day."}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots.map((s) => (
                <button
                  key={s.time}
                  type="button"
                  onClick={() => setTime(s.time)}
                  aria-pressed={time === s.time}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${
                    time === s.time ? "border-blush-400 bg-blush-500 text-white" : "border-blush-100 bg-white text-blush-800 hover:border-blush-300"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {fe.time && <p className="mt-2 text-xs text-red-500">{fe.time}</p>}
        </div>
      </section>

      <section className="glass-card p-6">
        <h2 className="text-lg font-semibold text-blush-900">{staff.length > 0 ? "4" : "3"}. Your details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Full name" name="name" autoComplete="name" required error={fe.name} />
          <Input label="Phone number" name="phone" type="tel" autoComplete="tel" required error={fe.phone} />
          <Input label="Email (optional)" name="email" type="email" autoComplete="email" wrapperClassName="sm:col-span-2" error={fe.email} />
          <Textarea
            label="Special notes (optional)"
            name="notes"
            placeholder="Nail art ideas, allergies, anything we should know"
            wrapperClassName="sm:col-span-2"
            error={fe.notes}
          />
        </div>
      </section>

      {service && time && (
        <p className="rounded-2xl bg-blush-50 px-4 py-3 text-sm text-blush-900">
          <strong>{service.name}</strong> · {formatDate(date)} at {slots.find((s) => s.time === time)?.label ?? time}
          {staffId && staff.find((s) => s.id === staffId) ? ` · with ${staff.find((s) => s.id === staffId)!.full_name}` : ""}
        </p>
      )}

      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Booking…">
        {serviceId && time ? "Confirm appointment request" : "Pick a service and time"}
      </SubmitButton>
      <p className="text-center text-xs text-blush-800/60">
        The salon will confirm your request by phone or text. No payment is taken online.
      </p>
    </form>
  );
}
