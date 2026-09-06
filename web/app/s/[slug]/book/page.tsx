import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSalon, getStorefrontData } from "@/lib/storefront";
import { upcomingDates } from "@/lib/availability";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { BookingWizard } from "@/components/booking/BookingWizard";

export const metadata: Metadata = { title: "Book an appointment" };
export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();
  const data = await getStorefrontData(salon.id);
  const dates = upcomingDates(salon.timezone, Math.min(salon.booking_window_days ?? 60, 21));

  return (
    <StorefrontShell salon={salon}>
      <div className="mx-auto max-w-3xl px-6 py-14">
        <div className="text-center">
          <span className="section-eyebrow">Book online</span>
          <h1 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">Schedule your appointment</h1>
          <p className="mx-auto mt-3 max-w-xl text-blush-800/70">
            Choose a service, pick a time that works for you, and we&apos;ll take care of the rest.
          </p>
        </div>
        <div className="mt-10">
          {salon.online_booking_enabled ? (
            <BookingWizard slug={slug} services={data.services} categories={data.categories} staff={data.staff} hours={data.hours} dates={dates} />
          ) : (
            <div className="glass-card p-8 text-center">
              <p className="text-blush-900">Online booking is currently unavailable.</p>
              {salon.phone && (
                <p className="mt-2 text-sm text-blush-800/70">
                  Please call us at{" "}
                  <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="text-blush-500 hover:underline">
                    {salon.phone}
                  </a>
                  .
                </p>
              )}
              <Link href={`/s/${slug}`} className="btn-secondary mt-6">
                Back to salon
              </Link>
            </div>
          )}
        </div>
      </div>
    </StorefrontShell>
  );
}
