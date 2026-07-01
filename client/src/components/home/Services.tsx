import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { salonApi } from "../../lib/api";
import type { Service } from "../../lib/types";
import { Card } from "../ui/Card";
import { LoadingSpinner } from "../ui/LoadingSpinner";

function formatPrice(service: Service): string {
  if (service.price_label) return service.price_label;
  return `$${(service.price_cents / 100).toFixed(0)}`;
}

export function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    salonApi
      .getServices()
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="services" className="mx-auto max-w-7xl px-6 py-20">
      <div className="text-center">
        <span className="section-eyebrow">Our Menu</span>
        <h2 className="mt-3 text-3xl font-bold text-blush-900 md:text-4xl">Services &amp; Pricing</h2>
        <p className="mx-auto mt-3 max-w-xl text-blush-800/70">
          From classic manicures to premium Gel X sets — every service includes our signature
          relaxing touch.
        </p>
      </div>

      {loading ? (
        <div className="mt-14 flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, i) => (
            <Card
              key={service.id}
              className="animate-fadeInUp transition hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-serif font-semibold text-blush-900">{service.name}</h3>
                <span className="whitespace-nowrap rounded-full bg-gold-50 px-3 py-1 text-sm font-semibold text-gold-600">
                  {formatPrice(service)}
                </span>
              </div>
              {service.description && (
                <p className="mt-2 text-sm text-blush-800/70">{service.description}</p>
              )}
              <p className="mt-4 text-xs uppercase tracking-wide text-blush-400">
                {service.duration_minutes} min
              </p>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link to="/booking" className="btn-gold">
          Book Your Service
        </Link>
      </div>
    </section>
  );
}
