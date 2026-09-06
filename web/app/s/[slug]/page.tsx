import { notFound } from "next/navigation";
import { getPublicSalon, getStorefrontData } from "@/lib/storefront";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";
import { FaqList, Gallery, Hero, HoursAndContact, ServiceMenu, StaffGrid } from "@/components/storefront/Sections";

export const revalidate = 60;

export default async function PublicSalonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();
  const data = await getStorefrontData(salon.id);

  return (
    <StorefrontShell salon={salon}>
      <Hero salon={salon} promotions={data.promotions} />
      <ServiceMenu services={data.services} categories={data.categories} bookHref={salon.online_booking_enabled ? `/s/${slug}/book` : undefined} />
      <Gallery images={data.gallery} />
      <StaffGrid staff={data.staff} />
      <HoursAndContact salon={salon} hours={data.hours} />
      <FaqList faqs={data.faqs} />
    </StorefrontShell>
  );
}
