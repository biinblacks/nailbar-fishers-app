import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { formatDate, formatPrice, formatTime, STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";
import type { Appointment, Customer } from "@/lib/types";
import { deleteCustomerAction } from "@/actions/customers";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { CustomerForm } from "@/components/forms/CustomerForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const [customerRes, historyRes] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).eq("salon_id", salon.id).maybeSingle(),
    supabase
      .from("appointments")
      .select("*, services(name, price_cents, price_label, duration_minutes), staff(full_name, color)")
      .eq("salon_id", salon.id)
      .eq("customer_id", id)
      .order("appointment_date", { ascending: false })
      .order("appointment_time", { ascending: false })
      .limit(50),
  ]);
  if (!customerRes.data) notFound();
  const customer = customerRes.data as Customer;
  const history = (historyRes.data ?? []) as Appointment[];
  const completed = history.filter((a) => a.status === "completed");
  const lifetimeCents = completed.reduce((sum, a) => sum + (a.services?.price_cents ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Customers"
        title={customer.full_name}
        description={`${customer.phone}${customer.email ? ` · ${customer.email}` : ""}`}
        actions={
          <>
            <LinkButton href={`/app/${slug}/appointments/new?customer=${customer.id}`}>Book appointment</LinkButton>
            <ConfirmButton
              action={deleteCustomerAction}
              hidden={{ slug, id }}
              confirmText={`Delete ${customer.full_name}? Their appointments stay on the calendar but lose the link to this profile.`}
            >
              Delete
            </ConfirmButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Visits</p>
          <p className="mt-1 text-2xl font-serif font-bold text-blush-700">{completed.length}</p>
        </Card>
        <Card className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Lifetime value</p>
          <p className="mt-1 text-2xl font-serif font-bold text-blush-700">{formatPrice(lifetimeCents)}</p>
        </Card>
        <Card className="!p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blush-800/60">Customer since</p>
          <p className="mt-1 text-2xl font-serif font-bold text-blush-700">
            {new Date(customer.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-blush-900">Profile</h2>
          <div className="mt-4">
            <CustomerForm slug={slug} customer={customer} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-blush-900">Appointment history</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-blush-800/60">No appointments yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-blush-50">
              {history.map((a) => (
                <li key={a.id} className="py-3">
                  <Link href={`/app/${slug}/appointments/${a.id}`} className="block hover:underline">
                    <p className="text-sm font-medium text-blush-900">
                      {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)}
                    </p>
                  </Link>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs text-blush-800/60">
                    <span className="truncate">
                      {a.services?.name ?? "Service"}
                      {a.staff?.full_name ? ` · ${a.staff.full_name}` : ""}
                    </span>
                    <Badge className={STATUS_CLASSES[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
