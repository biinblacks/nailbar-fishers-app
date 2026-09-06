import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSalon } from "@/lib/storefront";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getPublicSalon(slug);
  if (!salon) return { title: "Salon not found" };
  return {
    title: { default: salon.name, template: `%s · ${salon.name}` },
    description: `${salon.name}${salon.address ? ` in ${salon.address}` : ""}. Book online or chat with our AI receptionist 24/7.`,
    openGraph: { title: salon.name, type: "website" },
  };
}

export default async function PublicSalonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();
  return <>{children}</>;
}
