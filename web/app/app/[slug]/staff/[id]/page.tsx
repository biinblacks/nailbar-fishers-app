import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import type { Staff } from "@/lib/types";
import { deleteStaffAction } from "@/actions/staff";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StaffForm } from "@/components/forms/StaffForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Edit technician" };

export default async function EditStaffPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("staff").select("*").eq("id", id).eq("salon_id", salon.id).maybeSingle();
  if (!data) notFound();
  const member = data as Staff;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Team"
        title={member.full_name}
        actions={
          <ConfirmButton
            action={deleteStaffAction}
            hidden={{ slug, id }}
            confirmText={`Remove ${member.full_name}? Their past appointments are kept. Consider deactivating instead.`}
          >
            Delete
          </ConfirmButton>
        }
      />
      <Card>
        <StaffForm slug={slug} staff={member} />
      </Card>
    </div>
  );
}
