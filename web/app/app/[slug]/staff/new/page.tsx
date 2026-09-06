import type { Metadata } from "next";
import { requireSalonAccess } from "@/lib/salon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StaffForm } from "@/components/forms/StaffForm";

export const metadata: Metadata = { title: "New technician" };

export default async function NewStaffPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireSalonAccess(slug);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Team" title="Add a technician" />
      <Card>
        <StaffForm slug={slug} />
      </Card>
    </div>
  );
}
