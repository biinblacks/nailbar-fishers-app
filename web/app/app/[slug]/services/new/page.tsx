import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import type { ServiceCategory } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ServiceForm } from "@/components/forms/ServiceForm";

export const metadata: Metadata = { title: "New service" };

export default async function NewServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("service_categories").select("*").eq("salon_id", salon.id).order("display_order");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Services" title="Add a service" />
      <Card>
        <ServiceForm slug={slug} categories={(data ?? []) as ServiceCategory[]} />
      </Card>
    </div>
  );
}
