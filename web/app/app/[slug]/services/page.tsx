import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { formatPrice } from "@/lib/format";
import type { Service, ServiceCategory } from "@/lib/types";
import { deleteCategoryAction, toggleServiceAction } from "@/actions/services";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CategoryForm } from "@/components/forms/CategoryForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const [servicesRes, categoriesRes] = await Promise.all([
    supabase
      .from("services")
      .select("*, service_categories(name)")
      .eq("salon_id", salon.id)
      .order("display_order")
      .order("name"),
    supabase.from("service_categories").select("*").eq("salon_id", salon.id).order("display_order"),
  ]);
  const services = (servicesRes.data ?? []) as Service[];
  const categories = (categoriesRes.data ?? []) as ServiceCategory[];

  const grouped = new Map<string, Service[]>();
  for (const s of services) {
    const key = s.service_categories?.name ?? "Uncategorized";
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  }
  const orderedKeys = [
    ...categories.map((c) => c.name).filter((n) => grouped.has(n)),
    ...(grouped.has("Uncategorized") ? ["Uncategorized"] : []),
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Menu"
        title="Services & prices"
        description="What customers can book. Inactive services stay hidden from the storefront and the AI receptionist."
        actions={<LinkButton href={`/app/${slug}/services/new`}>Add service</LinkButton>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {services.length === 0 ? (
            <EmptyState
              title="No services yet"
              description="Add your menu so customers and the AI receptionist can quote prices and book."
              action={<LinkButton href={`/app/${slug}/services/new`}>Add your first service</LinkButton>}
            />
          ) : (
            orderedKeys.map((key) => (
              <section key={key}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blush-800/60">{key}</h2>
                <div className="table-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>Service</th>
                        <th>Price</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.get(key)!.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <Link href={`/app/${slug}/services/${s.id}`} className="font-medium text-blush-900 hover:underline">
                              {s.name}
                            </Link>
                            {s.description && (
                              <p className="mt-0.5 max-w-md truncate text-xs text-blush-800/60">{s.description}</p>
                            )}
                          </td>
                          <td className="whitespace-nowrap font-semibold text-gold-600">
                            {formatPrice(s.price_cents, s.price_label)}
                          </td>
                          <td className="whitespace-nowrap">{s.duration_minutes} min</td>
                          <td>
                            <Badge className={s.is_active ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-100 text-gray-600"}>
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td>
                            <div className="flex justify-end gap-2">
                              <form action={toggleServiceAction}>
                                <input type="hidden" name="slug" value={slug} />
                                <input type="hidden" name="id" value={s.id} />
                                <input type="hidden" name="is_active" value={s.is_active ? "false" : "true"} />
                                <button type="submit" className="text-xs font-medium text-blush-500 hover:underline">
                                  {s.is_active ? "Deactivate" : "Activate"}
                                </button>
                              </form>
                              <Link href={`/app/${slug}/services/${s.id}`} className="text-xs font-medium text-blush-500 hover:underline">
                                Edit
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>

        <Card className="h-fit">
          <h2 className="text-lg font-semibold text-blush-900">Categories</h2>
          <p className="mt-1 text-xs text-blush-800/60">Group your menu (Manicure, Pedicure, Enhancements…).</p>
          <ul className="mt-4 space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl bg-blush-50/60 px-3 py-2 text-sm">
                <span className="font-medium text-blush-900">{c.name}</span>
                <ConfirmButton
                  action={deleteCategoryAction}
                  hidden={{ slug, id: c.id }}
                  confirmText={`Delete category "${c.name}"? Services in it will become uncategorized.`}
                  variant="secondary"
                  className="!px-3 !py-1 text-xs"
                >
                  Remove
                </ConfirmButton>
              </li>
            ))}
            {categories.length === 0 && <li className="text-sm text-blush-800/60">No categories yet.</li>}
          </ul>
          <div className="mt-4">
            <CategoryForm slug={slug} />
          </div>
        </Card>
      </div>
    </div>
  );
}
