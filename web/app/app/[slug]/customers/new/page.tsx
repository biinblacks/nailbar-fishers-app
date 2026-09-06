import type { Metadata } from "next";
import { requireSalonAccess } from "@/lib/salon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { CustomerForm } from "@/components/forms/CustomerForm";

export const metadata: Metadata = { title: "New customer" };

export default async function NewCustomerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireSalonAccess(slug);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Customers" title="Add a customer" />
      <Card>
        <CustomerForm slug={slug} />
      </Card>
    </div>
  );
}
