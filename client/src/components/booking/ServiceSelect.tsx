import type { Service } from "../../lib/types";

function formatPrice(service: Service): string {
  if (service.price_label) return service.price_label;
  return `$${(service.price_cents / 100).toFixed(0)}`;
}

interface ServiceSelectProps {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ServiceSelect({ services, selectedId, onSelect }: ServiceSelectProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {services.map((service) => {
        const active = service.id === selectedId;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? "border-blush-400 bg-blush-50 shadow-soft"
                : "border-blush-100 bg-white hover:border-blush-200"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-blush-900">{service.name}</span>
              <span className="whitespace-nowrap text-sm font-semibold text-gold-600">
                {formatPrice(service)}
              </span>
            </div>
            <p className="mt-1 text-xs text-blush-800/60">{service.duration_minutes} min</p>
          </button>
        );
      })}
    </div>
  );
}
