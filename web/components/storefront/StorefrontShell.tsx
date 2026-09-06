import Image from "next/image";
import Link from "next/link";
import type { PublicSalon } from "@/lib/storefront";
import { ChatWidget } from "@/components/chat/ChatWidget";

interface Props {
  salon: PublicSalon;
  children: React.ReactNode;
  /** Hide the floating chat (e.g. on the embed page which renders its own). */
  hideChat?: boolean;
}

export function StorefrontShell({ salon, children, hideChat }: Props) {
  const base = `/s/${salon.slug}`;
  const nameParts = salon.name.split(" ");
  return (
    <div className="min-h-screen bg-gradient-to-b from-blush-50 via-white to-white">
      <header className="sticky top-0 z-40 bg-white/80 shadow-sm backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Salon">
          <Link href={base} className="flex items-center gap-3 font-serif text-2xl font-bold tracking-wide text-blush-600">
            {salon.logo_url && <Image src={salon.logo_url} alt="" width={40} height={40} className="h-10 w-10 rounded-xl object-cover" />}
            <span>
              {nameParts.slice(0, -1).join(" ")} <span className="text-gold-500">{nameParts.at(-1)}</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-blush-800">
            <Link href={`${base}#services`} className="hidden hover:text-blush-500 sm:inline">
              Services
            </Link>
            <Link href={`${base}#hours`} className="hidden hover:text-blush-500 sm:inline">
              Hours
            </Link>
            {salon.phone && (
              <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="hidden hover:text-blush-500 md:inline">
                {salon.phone}
              </a>
            )}
            {salon.online_booking_enabled && (
              <Link href={`${base}/book`} className="btn-primary !px-5 !py-2">
                Book now
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="border-t border-blush-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 text-sm text-blush-800/80 md:grid-cols-3">
          <div>
            <p className="font-serif text-xl font-bold text-blush-600">{salon.name}</p>
            {salon.address && <p className="mt-2">{salon.address}</p>}
            {salon.phone && (
              <p className="mt-1">
                <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="hover:text-blush-500">
                  {salon.phone}
                </a>
              </p>
            )}
            {salon.email && (
              <p className="mt-1">
                <a href={`mailto:${salon.email}`} className="hover:text-blush-500">
                  {salon.email}
                </a>
              </p>
            )}
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-blush-900">Quick links</p>
            <ul className="mt-3 space-y-1.5">
              {salon.online_booking_enabled && (
                <li>
                  <Link href={`${base}/book`} className="hover:text-blush-500">
                    Book an appointment
                  </Link>
                </li>
              )}
              <li>
                <Link href={`${base}#services`} className="hover:text-blush-500">
                  Services &amp; pricing
                </Link>
              </li>
              {salon.google_map_link && (
                <li>
                  <a href={salon.google_map_link} target="_blank" rel="noopener noreferrer" className="hover:text-blush-500">
                    Directions
                  </a>
                </li>
              )}
            </ul>
          </div>
          <div>
            <p className="font-semibold uppercase tracking-wide text-blush-900">Follow us</p>
            <ul className="mt-3 space-y-1.5">
              {salon.instagram_link && (
                <li>
                  <a href={salon.instagram_link} target="_blank" rel="noopener noreferrer" className="hover:text-blush-500">
                    Instagram
                  </a>
                </li>
              )}
              {salon.facebook_link && (
                <li>
                  <a href={salon.facebook_link} target="_blank" rel="noopener noreferrer" className="hover:text-blush-500">
                    Facebook
                  </a>
                </li>
              )}
              {salon.google_review_link && (
                <li>
                  <a href={salon.google_review_link} target="_blank" rel="noopener noreferrer" className="hover:text-blush-500">
                    Leave a Google review
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-blush-100 py-5 text-center text-xs text-blush-800/60">
          © {new Date().getFullYear()} {salon.name}. All rights reserved.
        </div>
      </footer>

      {!hideChat && salon.ai_enabled && (
        <ChatWidget
          slug={salon.slug}
          salonName={salon.name}
          salonPhone={salon.phone}
          greeting={salon.ai_greeting}
          bookingHref={salon.online_booking_enabled ? `${base}/book` : undefined}
        />
      )}
    </div>
  );
}
