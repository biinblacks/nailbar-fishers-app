import { useEffect, useState } from "react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi } from "../../lib/api";
import type { Service } from "../../lib/types";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";

interface DraftService {
  name: string;
  description: string;
  price_cents: number;
  price_label: string;
  duration_minutes: number;
}

const EMPTY_DRAFT: DraftService = {
  name: "",
  description: "",
  price_cents: 0,
  price_label: "",
  duration_minutes: 30,
};

export function ServicesAdmin() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftService>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const data = await adminApi.listServices();
    setServices(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      await adminApi.createService({
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        price_cents: Math.round(draft.price_cents * 100),
        price_label: draft.price_label.trim() || null,
        duration_minutes: draft.duration_minutes,
        is_active: true,
      });
      setDraft(EMPTY_DRAFT);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(service: Service) {
    await adminApi.updateService(service.id, { is_active: !service.is_active });
    await load();
  }

  async function handleDelete(id: string) {
    await adminApi.deleteService(id);
    await load();
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-blush-900">Manage Services &amp; Prices</h1>

      <Card className="mt-6">
        <h2 className="font-serif text-lg font-semibold text-blush-900">Add New Service</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
          />
          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            min="0"
            value={draft.price_cents || ""}
            onChange={(e) => setDraft((d) => ({ ...d, price_cents: Number(e.target.value) }))}
            required
          />
          <Input
            label="Price Label (optional, e.g. 'starts at $65')"
            value={draft.price_label}
            onChange={(e) => setDraft((d) => ({ ...d, price_label: e.target.value }))}
          />
          <Input
            label="Duration (minutes)"
            type="number"
            min="5"
            value={draft.duration_minutes}
            onChange={(e) => setDraft((d) => ({ ...d, duration_minutes: Number(e.target.value) }))}
            required
          />
          <Input
            label="Description (optional)"
            className="sm:col-span-2"
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          />
          <Button type="submit" disabled={saving} className="sm:col-span-2">
            {saving ? <LoadingSpinner className="border-white/40 border-t-white" /> : "Add Service"}
          </Button>
        </form>
      </Card>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <Card key={service.id} className="flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif font-semibold text-blush-900">{service.name}</h3>
                  <span className="text-sm font-semibold text-gold-600">
                    {service.price_label ?? `$${(service.price_cents / 100).toFixed(0)}`}
                  </span>
                </div>
                <p className="mt-1 text-xs text-blush-800/60">{service.duration_minutes} min</p>
                {service.description && (
                  <p className="mt-2 text-sm text-blush-800/70">{service.description}</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => void handleToggleActive(service)}>
                  {service.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="secondary" onClick={() => void handleDelete(service.id)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
