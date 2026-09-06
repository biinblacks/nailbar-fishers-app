import Link from "next/link";
import { DAY_NAMES, formatPrice, formatTime } from "@/lib/format";
import type { BusinessHour, Service, ServiceCategory, Staff } from "@/lib/types";
import type { Faq, Promotion, PublicSalon } from "@/lib/storefront";
import { Avatar } from "@/components/ui/Avatar";

export function Hero({ salon, promotions }: { salon: PublicSalon; promotions: Promotion[] }) {
  const base = `/s/${salon.slug}`;
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-14 md:pt-20">
      <div aria-hidden className="absolute -top-24 right-[-10%] h-96 w-96 rounded-full bg-blush-200/50 blur-3xl" />
      <div aria-hidden className="absolute bottom-[-4rem] left-[-6rem] h-80 w-80 rounded-full bg-gold-100/60 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        {salon.address && <span className="section-eyebrow">{salon.address}</span>}
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-blush-900 md:text-6xl">
          Luxury nails, <span className="text-blush-500">effortless</span> booking.
        </h1>
        <p className="mt-6 max-w-lg text-base text-blush-800/80 md:text-lg">
          Welcome to {salon.name}. Browse our menu, chat with our AI receptionist any time, or book your visit in under a minute.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          {salon.online_booking_enabled && (
            <Link href={`${base}/book`} className="btn-primary">
              Book an appointment
            </Link>
          )}
          <a href="#services" className="btn-secondary">
            See services
          </a>
        </div>
        {promotions.length > 0 && (
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {promotions.slice(0, 2).map((p) => (
              <div key={p.id} className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">Promotion</p>
                <p className="mt-1 font-semibold text-blush-900">{p.title}</p>
                <p className="mt-1 text-sm text-blush-800/70">{p.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function ServiceMenu({ services, categories, bookHref }: { services: Service[]; categories: ServiceCategory[]; bookHref?: string }) {
  const grouped = new Map<string, Service[]>();
  for (const s of services) {
    const key = s.service_categories?.name ?? "Other";
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  }
  const order = [...categories.map((c) => c.name), "Other"].filter((k) => grouped.has(k));

  return (
    <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
      <div className="text-center">
        <span className="section-eyebrow">Our menu</span>
        <h2 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">Services &amp; pricing</h2>
      </div>
      {services.length === 0 ? (
        <p className="mt-10 text-center text-sm text-blush-800/60">Menu coming soon.</p>
      ) : (
        <div className="mt-12 space-y-10">
          {order.map((cat) => (
            <div key={cat}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-blush-800/60">{cat}</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped.get(cat)!.map((s) => (
                  <div key={s.id} className="glass-card p-5 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-lg font-semibold text-blush-900">{s.name}</h4>
                      <span className="whitespace-nowrap rounded-full bg-gold-50 px-3 py-1 text-sm font-semibold text-gold-600">
                        {formatPrice(s.price_cents, s.price_label)}
                      </span>
                    </div>
                    {s.description && <p className="mt-2 text-sm text-blush-800/70">{s.description}</p>}
                    <p className="mt-3 text-xs uppercase tracking-wide text-blush-400">{s.duration_minutes} min</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {bookHref && (
        <div className="mt-12 text-center">
          <Link href={bookHref} className="btn-gold">
            Book your service
          </Link>
        </div>
      )}
    </section>
  );
}

export function StaffGrid({ staff }: { staff: Staff[] }) {
  if (staff.length === 0) return null;
  return (
    <section id="team" className="bg-blush-50/60 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <span className="section-eyebrow">The team</span>
          <h2 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">Meet our technicians</h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {staff.map((m) => (
            <div key={m.id} className="glass-card p-5 text-center">
              <div className="flex justify-center">
                <Avatar name={m.full_name} color={m.color} />
              </div>
              <p className="mt-3 font-semibold text-blush-900">{m.full_name}</p>
              <p className="text-xs uppercase tracking-wide text-gold-500">{m.title ?? "Nail Technician"}</p>
              {m.bio && <p className="mt-2 text-sm text-blush-800/70">{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HoursAndContact({ salon, hours }: { salon: PublicSalon; hours: BusinessHour[] }) {
  const mapQuery = salon.address ? encodeURIComponent(salon.address) : null;
  return (
    <section id="hours" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-16">
      <div className="glass-card grid gap-10 p-8 md:grid-cols-2">
        <div>
          <span className="section-eyebrow">Visit us</span>
          <h2 className="mt-3 text-3xl font-bold text-blush-900">Hours &amp; location</h2>
          <dl className="mt-6 space-y-1.5 text-sm">
            {hours.map((h) => (
              <div key={h.day_of_week} className="flex justify-between border-b border-blush-50 py-1.5">
                <dt className="font-medium text-blush-900">{DAY_NAMES[h.day_of_week]}</dt>
                <dd className="text-blush-800/80">{h.is_closed ? "Closed" : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-6 space-y-2 text-sm text-blush-900">
            {salon.address && (
              <li>
                <span className="font-semibold">Address:</span> {salon.address}
              </li>
            )}
            {salon.phone && (
              <li>
                <span className="font-semibold">Phone:</span>{" "}
                <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="text-blush-500 hover:underline">
                  {salon.phone}
                </a>
              </li>
            )}
            {salon.parking_info && (
              <li>
                <span className="font-semibold">Parking:</span> {salon.parking_info}
              </li>
            )}
          </ul>
        </div>
        {mapQuery && (
          <div className="overflow-hidden rounded-2xl">
            <iframe
              title={`${salon.name} location`}
              className="h-72 w-full rounded-2xl border-0 md:h-full"
              loading="lazy"
              src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  if (faqs.length === 0) return null;
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 pb-20">
      <div className="text-center">
        <span className="section-eyebrow">Good to know</span>
        <h2 className="mt-3 text-3xl font-bold text-blush-900">Frequently asked questions</h2>
      </div>
      <div className="mt-8 space-y-3">
        {faqs.map((f) => (
          <details key={f.id} className="glass-card group p-5">
            <summary className="cursor-pointer list-none font-semibold text-blush-900">{f.question}</summary>
            <p className="mt-2 text-sm text-blush-800/70">{f.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
