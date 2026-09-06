import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { todayInTimezone } from "@/lib/format";
import type { Customer, Service, Staff } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { AppointmentForm } from "@/components/forms/AppointmentForm";

export const metadata: Metadata = { title: "New appointment" };

export default async function NewAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string; time?: string; customer?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const [servicesRes, staffRes, customersRes] = await Promise.all([
    supabase.from("services").select("*").eq("salon_id", salon.id).eq("is_active", true).order("display_order"),
    supabase.from("staff").select("*").eq("salon_id", salon.id).eq("is_active", true).order("display_order"),
    supabase.from("customers").select("id, full_name, phone, email").eq("salon_id", salon.id).order("full_name").limit(500),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Calendar" title="Book an appointment" />
      <Card>
        <AppointmentForm
          slug={slug}
          services={(servicesRes.data ?? []) as Service[]}
          staff={(staffRes.data ?? []) as Staff[]}
          customers={(customersRes.data ?? []) as Pick<Customer, "id" | "full_name" | "phone" | "email">[]}
          defaults={{
            date: sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayInTimezone(salon.timezone),
            time: sp.time && /^\d{2}:\d{2}$/.test(sp.time) ? sp.time : undefined,
            customerId: sp.customer,
          }}
        />
      </Card>
    </div>
  );
}
