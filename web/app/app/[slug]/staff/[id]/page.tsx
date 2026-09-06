import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import type { Staff } from "@/lib/types";
import { deleteStaffAction } from "@/actions/staff";
import { removeStaffPhotoAction, uploadStaffPhotoAction } from "@/actions/media";
import { Avatar } from "@/components/ui/Avatar";
import { ImageUploadForm } from "@/components/forms/ImageUploadForm";
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
        <h2 className="text-lg font-semibold text-blush-900">Photo</h2>
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <Avatar name={member.full_name} color={member.color} src={member.photo_url} size="lg" />
          <div className="min-w-[260px] flex-1">
            <ImageUploadForm action={uploadStaffPhotoAction} hidden={{ slug, id }} label="Upload a photo" buttonText="Save photo" />
          </div>
          {member.photo_url && (
            <ConfirmButton action={removeStaffPhotoAction} hidden={{ slug, id }} confirmText="Remove this photo?" variant="secondary" className="!px-3 !py-1.5 text-xs">
              Remove photo
            </ConfirmButton>
          )}
        </div>
      </Card>
      <Card>
        <StaffForm slug={slug} staff={member} />
      </Card>
    </div>
  );
}
