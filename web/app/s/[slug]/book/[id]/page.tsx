import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSalon } from "@/lib/storefront";
import { getPublicAppointment } from "@/lib/booking";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

export const metadata: Metadata = { title: "Appointment requested" };
export const dynamic = "force-dynamic";

export default async function BookingConfirmationPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();
  const appt = await getPublicAppointment(salon.id, id);
  if (!appt) notFound();

  const rows: Array<[string, string]> = [
    ["Service", appt.services?.name ?? "—"],
    ["Date", formatDate(appt.appointment_date, { weekday: "long", month: "long" })],
    ["Time", formatTime(appt.appointment_time)],
    ["Technician", appt.staff?.full_name ?? "First available"],
    ["Name", appt.customer_name],
    ["Phone", appt.customer_phone],
  ];
  if (appt.services) rows.splice(1, 0, ["Price", formatPrice(appt.services.price_cents, appt.services.price_label)]);

  return (
    <StorefrontShell salon={salon}>
      <div className="mx-auto max-w-lg px-6 py-20">
        <div className="glass-card animate-fadeInUp p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush-50 text-3xl text-blush-500" aria-hidden>
            ✓
          </div>
          <h1 className="mt-6 text-2xl font-bold text-blush-900">
            {appt.status === "confirmed" ? "Appointment confirmed" : "Appointment requested"}
          </h1>
          <p className="mt-2 text-sm text-blush-800/70">
            {appt.status === "confirmed"
              ? "We look forward to seeing you."
              : "We've received your request. Our team will confirm shortly by phone or text."}
          </p>
          <dl className="mt-6 space-y-2 rounded-2xl bg-blush-50 p-5 text-left text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-blush-800/60">{k}</dt>
                <dd className="text-right font-medium text-blush-900">{v}</dd>
              </div>
            ))}
          </dl>
          {salon.address && <p className="mt-4 text-xs text-blush-800/60">{salon.address}</p>}
          <Link href={`/s/${slug}`} className="btn-primary mt-8 w-full">
            Back to {salon.name}
          </Link>
        </div>
      </div>
    </StorefrontShell>
  );
}
