import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { addDays, formatDate, formatTime, todayInTimezone } from "@/lib/format";
import type { Appointment } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusSelect } from "@/components/forms/StatusSelect";
import { Avatar } from "@/components/ui/Avatar";

export default async function DashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const today = todayInTimezone(salon.timezone);
  const weekEnd = addDays(today, 7);

  const [todayRes, upcomingRes, pendingRes, customersRes, servicesRes, staffRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, services(name, price_cents, price_label, duration_minutes), staff(full_name, color)")
      .eq("salon_id", salon.id)
      .eq("appointment_date", today)
      .order("appointment_time"),
    supabase
      .from("appointments")
      .select("*, services(name, price_cents, price_label, duration_minutes), staff(full_name, color)")
      .eq("salon_id", salon.id)
      .gt("appointment_date", today)
      .lte("appointment_date", weekEnd)
      .in("status", ["pending", "confirmed"])
      .order("appointment_date")
      .order("appointment_time")
      .limit(8),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("salon_id", salon.id)
      .eq("status", "pending")
      .gte("appointment_date", today),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("salon_id", salon.id),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("salon_id", salon.id)
      .eq("is_active", true),
    supabase
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("salon_id", salon.id)
      .eq("is_active", true),
  ]);

  const todayAppointments = (todayRes.data ?? []) as Appointment[];
  const upcoming = (upcomingRes.data ?? []) as Appointment[];
  const activeToday = todayAppointments.filter((a) => a.status !== "cancelled" && a.status !== "no_show");

  const setupSteps = [
    { done: (servicesRes.count ?? 0) > 0, label: "Add your services", href: `/app/${slug}/services/new` },
    { done: (staffRes.count ?? 0) > 0, label: "Add your technicians", href: `/app/${slug}/staff/new` },
    { done: !!salon.address && !!salon.phone, label: "Complete your salon profile", href: `/app/${slug}/settings` },
  ];
  const needsSetup = setupSteps.some((s) => !s.done);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={formatDate(today, { weekday: "long", month: "long", day: "numeric", year: undefined })}
        title={`Good day, ${salon.name}`}
        description="Here's what's happening at the salon."
        actions={<LinkButton href={`/app/${slug}/appointments/new?date=${today}`}>New appointment</LinkButton>}
      />

      {needsSetup && (
        <section className="rounded-3xl border border-gold-200 bg-gold-50/60 p-5">
          <h2 className="font-semibold text-gold-800">Finish setting up</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {setupSteps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm transition hover:bg-white ${
                    step.done ? "text-blush-800/50 line-through" : "text-blush-900"
                  }`}
                >
                  <span aria-hidden>{step.done ? "✓" : "○"}</span>
                  {step.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={activeToday.length} hint="appointments" />
        <StatCard label="Awaiting confirmation" value={pendingRes.count ?? 0} hint="pending requests" />
        <StatCard label="Customers" value={customersRes.count ?? 0} hint="in your book" />
        <StatCard label="Active services" value={servicesRes.count ?? 0} hint={`${staffRes.count ?? 0} technicians`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="glass-card p-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-blush-900">Today&apos;s schedule</h2>
            <Link href={`/app/${slug}/appointments?from=${today}&to=${today}`} className="text-sm text-blush-500 hover:underline">
              View all
            </Link>
          </div>
          {todayAppointments.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Nothing booked yet today"
                description="Appointments booked online, by the AI receptionist, or at the front desk will show here."
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-blush-50">
              {todayAppointments.map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3">
                  <span className="w-20 shrink-0 text-sm font-semibold text-blush-700">
                    {formatTime(a.appointment_time)}
                  </span>
                  <Avatar name={a.staff?.full_name ?? "Any"} color={a.staff?.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/app/${slug}/appointments/${a.id}`} className="block truncate font-medium text-blush-900 hover:underline">
                      {a.customer_name}
                    </Link>
                    <p className="truncate text-xs text-blush-800/60">
                      {a.services?.name ?? "Service"} · {a.staff?.full_name ?? "Any technician"}
                    </p>
                  </div>
                  <StatusSelect slug={slug} id={a.id} status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-blush-900">Next 7 days</h2>
          {upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-blush-800/60">No upcoming appointments.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <Link href={`/app/${slug}/appointments/${a.id}`} className="block rounded-2xl border border-blush-50 bg-white px-4 py-3 transition hover:border-blush-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
                      {formatDate(a.appointment_date, { year: undefined })} · {formatTime(a.appointment_time)}
                    </p>
                    <p className="mt-1 font-medium text-blush-900">{a.customer_name}</p>
                    <p className="text-xs text-blush-800/60">{a.services?.name ?? "Service"}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
