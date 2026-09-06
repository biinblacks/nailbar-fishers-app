import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { formatDate, formatTime, STATUS_CLASSES, STATUS_LABELS } from "@/lib/format";
import type { Appointment, Customer, Service, Staff } from "@/lib/types";
import { deleteAppointmentAction } from "@/actions/appointments";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Appointment" };

export default async function AppointmentDetailPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const [apptRes, servicesRes, staffRes, customersRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, services(name, price_cents, price_label, duration_minutes), staff(full_name, color)")
      .eq("id", id)
      .eq("salon_id", salon.id)
      .maybeSingle(),
    supabase.from("services").select("*").eq("salon_id", salon.id).order("display_order"),
    supabase.from("staff").select("*").eq("salon_id", salon.id).order("display_order"),
    supabase.from("customers").select("id, full_name, phone, email").eq("salon_id", salon.id).order("full_name").limit(500),
  ]);
  if (!apptRes.data) notFound();
  const appointment = apptRes.data as Appointment;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Calendar"
        title={appointment.customer_name}
        description={`${formatDate(appointment.appointment_date)} · ${formatTime(appointment.appointment_time)} · booked via ${appointment.source.replace("_", " ")}`}
        actions={
          <>
            {appointment.customer_id && (
              <Link href={`/app/${slug}/customers/${appointment.customer_id}`} className="btn-secondary">
                View customer
              </Link>
            )}
            <ConfirmButton
              action={deleteAppointmentAction}
              hidden={{ slug, id }}
              confirmText="Delete this appointment permanently? Prefer marking it cancelled to keep history."
            >
              Delete
            </ConfirmButton>
          </>
        }
      />

      <div className="flex items-center gap-3 text-sm text-blush-800/70">
        <Badge className={STATUS_CLASSES[appointment.status]}>{STATUS_LABELS[appointment.status]}</Badge>
        {appointment.review_requested && <span>Review requested</span>}
        <span>Created {new Date(appointment.created_at).toLocaleString("en-US")}</span>
      </div>

      <Card>
        <AppointmentForm
          slug={slug}
          services={(servicesRes.data ?? []) as Service[]}
          staff={(staffRes.data ?? []) as Staff[]}
          customers={(customersRes.data ?? []) as Pick<Customer, "id" | "full_name" | "phone" | "email">[]}
          appointment={appointment}
        />
      </Card>
    </div>
  );
}
