import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { requireSalonAccess } from "@/lib/salon";
import { addGalleryImagesAction, deleteGalleryImageAction, updateGalleryCaptionAction } from "@/actions/media";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ImageUploadForm } from "@/components/forms/ImageUploadForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("salon_gallery").select("*").eq("salon_id", salon.id).order("display_order");
  const images = data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Storefront" title="Gallery" description="Photos of your work shown on your public page." />

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Add photos</h2>
        <div className="mt-4">
          <ImageUploadForm action={addGalleryImagesAction} hidden={{ slug }} label="Images (up to 10 at once)" name="files" multiple buttonText="Add to gallery">
            <input name="caption" placeholder="Optional caption for these photos" className="input-field" maxLength={120} />
          </ImageUploadForm>
        </div>
      </Card>

      {images.length === 0 ? (
        <EmptyState title="No photos yet" description="Upload a few of your best sets — they appear on your storefront instantly." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="glass-card overflow-hidden p-0">
              <div className="relative aspect-square">
                <Image src={img.image_url} alt={img.caption ?? "Gallery photo"} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
              </div>
              <div className="space-y-2 p-4">
                <form action={updateGalleryCaptionAction} className="flex gap-2">
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="id" value={img.id} />
                  <input name="caption" defaultValue={img.caption ?? ""} placeholder="Caption" aria-label="Caption" className="input-field !py-1.5 text-xs" maxLength={120} />
                  <button type="submit" className="btn-secondary !px-3 !py-1.5 text-xs">
                    Save
                  </button>
                </form>
                <ConfirmButton action={deleteGalleryImageAction} hidden={{ slug, id: img.id }} confirmText="Delete this photo?" className="!px-3 !py-1.5 text-xs">
                  Delete
                </ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
