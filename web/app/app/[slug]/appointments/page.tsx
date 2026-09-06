import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { addDays, formatDate, formatPrice, formatTime, todayInTimezone } from "@/lib/format";
import { APPOINTMENT_STATUSES, type Appointment, type AppointmentStatus, type Staff } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Avatar";
import { StatusSelect } from "@/components/forms/StatusSelect";

export const metadata: Metadata = { title: "Appointments" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; status?: string; staff?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const today = todayInTimezone(salon.timezone);
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : today;
  const to = sp.to && DATE_RE.test(sp.to) && sp.to >= from ? sp.to : addDays(from, 6);
  const status = APPOINTMENT_STATUSES.includes(sp.status as AppointmentStatus) ? (sp.status as AppointmentStatus) : "";
  const staffFilter = sp.staff ?? "";

  let query = supabase
    .from("appointments")
    .select("*, services(name, price_cents, price_label, duration_minutes), staff(full_name, color)")
    .eq("salon_id", salon.id)
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date")
    .order("appointment_time")
    .limit(500);
  if (status) query = query.eq("status", status);
  if (staffFilter) query = query.eq("staff_id", staffFilter);

  const [apptRes, staffRes] = await Promise.all([
    query,
    supabase.from("staff").select("*").eq("salon_id", salon.id).order("display_order"),
  ]);
  const appointments = (apptRes.data ?? []) as Appointment[];
  const staff = (staffRes.data ?? []) as Staff[];

  const byDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    byDay.set(a.appointment_date, [...(byDay.get(a.appointment_date) ?? []), a]);
  }

  const buildHref = (overrides: Record<string, string>) => {
    const q = new URLSearchParams({ from, to, ...(status ? { status } : {}), ...(staffFilter ? { staff: staffFilter } : {}), ...overrides });
    return `/app/${slug}/appointments?${q.toString()}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Calendar"
        title="Appointments"
        description="Every booking from the website, the AI receptionist, and the front desk."
        actions={<LinkButton href={`/app/${slug}/appointments/new?date=${from}`}>New appointment</LinkButton>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Link href={buildHref({ from: today, to: today })} className="btn-secondary !px-4 !py-2 text-xs">
          Today
        </Link>
        <Link href={buildHref({ from: today, to: addDays(today, 6) })} className="btn-secondary !px-4 !py-2 text-xs">
          Next 7 days
        </Link>
        <Link href={buildHref({ from: addDays(from, -7), to: addDays(to, -7) })} className="btn-secondary !px-3 !py-2 text-xs" aria-label="Previous period">
          ←
        </Link>
        <Link href={buildHref({ from: addDays(from, 7), to: addDays(to, 7) })} className="btn-secondary !px-3 !py-2 text-xs" aria-label="Next period">
          →
        </Link>
      </div>

      <form className="grid gap-3 rounded-2xl border border-blush-100 bg-white p-4 sm:grid-cols-5" role="search">
        <label className="text-xs font-medium text-blush-800">
          From
          <input type="date" name="from" defaultValue={from} className="input-field mt-1" />
        </label>
        <label className="text-xs font-medium text-blush-800">
          To
          <input type="date" name="to" defaultValue={to} className="input-field mt-1" />
        </label>
        <label className="text-xs font-medium text-blush-800">
          Status
          <select name="status" defaultValue={status} className="input-field mt-1">
            <option value="">All</option>
            {APPOINTMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-blush-800">
          Technician
          <select name="staff" defaultValue={staffFilter} className="input-field mt-1">
            <option value="">All</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">
            Apply
          </button>
        </div>
      </form>

      {appointments.length === 0 ? (
        <EmptyState
          title="No appointments in this range"
          description="Try a wider date range, or book one now."
          action={<LinkButton href={`/app/${slug}/appointments/new?date=${from}`}>New appointment</LinkButton>}
        />
      ) : (
        <div className="space-y-6">
          {Array.from(byDay.entries()).map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wide text-blush-800/60">
                {formatDate(day, { weekday: "long" })}
                {day === today && <span className="rounded-full bg-blush-500 px-2 py-0.5 text-[10px] text-white">Today</span>}
                <span className="font-normal normal-case">· {list.length} booked</span>
              </h2>
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Customer</th>
                      <th>Service</th>
                      <th>Technician</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((a) => (
                      <tr key={a.id}>
                        <td className="whitespace-nowrap font-semibold text-blush-700">
                          {formatTime(a.appointment_time)}
                          <span className="block text-[11px] font-normal text-blush-800/50">
                            {a.duration_minutes ?? a.services?.duration_minutes ?? "—"} min
                          </span>
                        </td>
                        <td>
                          <Link href={`/app/${slug}/appointments/${a.id}`} className="font-medium text-blush-900 hover:underline">
                            {a.customer_name}
                          </Link>
                          <span className="block text-xs text-blush-800/60">{a.customer_phone}</span>
                        </td>
                        <td>
                          {a.services?.name ?? "—"}
                          {a.services && (
                            <span className="block text-xs text-gold-600">
                              {formatPrice(a.services.price_cents, a.services.price_label)}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="flex items-center gap-2">
                            <Avatar name={a.staff?.full_name ?? "Any"} color={a.staff?.color} size="sm" />
                            <span className="text-sm">{a.staff?.full_name ?? "Any"}</span>
                          </span>
                        </td>
                        <td>
                          <StatusSelect slug={slug} id={a.id} status={a.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
