import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import type { Service, ServiceCategory } from "@/lib/types";
import { deleteServiceAction } from "@/actions/services";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ServiceForm } from "@/components/forms/ServiceForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Edit service" };

export default async function EditServicePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();

  const [serviceRes, categoriesRes] = await Promise.all([
    supabase.from("services").select("*").eq("id", id).eq("salon_id", salon.id).maybeSingle(),
    supabase.from("service_categories").select("*").eq("salon_id", salon.id).order("display_order"),
  ]);
  if (!serviceRes.data) notFound();
  const service = serviceRes.data as Service;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Services"
        title={service.name}
        actions={
          <ConfirmButton
            action={deleteServiceAction}
            hidden={{ slug, id }}
            confirmText={`Delete "${service.name}"? Past appointments keep their history. Consider deactivating instead.`}
          >
            Delete
          </ConfirmButton>
        }
      />
      <Card>
        <ServiceForm slug={slug} categories={(categoriesRes.data ?? []) as ServiceCategory[]} service={service} />
      </Card>
    </div>
  );
}
