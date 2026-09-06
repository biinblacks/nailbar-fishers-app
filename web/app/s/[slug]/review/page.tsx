import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSalon } from "@/lib/storefront";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

/** Post-visit thank-you page with the Google review CTA (used by review automations in Phase 4). */
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ name?: string }>;
}) {
  const { slug } = await params;
  const { name } = await searchParams;
  const salon = await getPublicSalon(slug);
  if (!salon) notFound();
  const safeName = name?.slice(0, 60);

  return (
    <StorefrontShell salon={salon}>
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="glass-card animate-fadeInUp p-8">
          <p className="text-3xl text-gold-400" aria-hidden>
            ★★★★★
          </p>
          <h1 className="mt-4 text-2xl font-bold text-blush-900">Thank you{safeName ? `, ${safeName}` : ""}, for visiting us!</h1>
          <p className="mt-3 text-sm text-blush-800/70">
            We hope you loved your experience at {salon.name}. If you have a moment, a Google review helps our small business grow.
          </p>
          {salon.google_review_link ? (
            <a href={salon.google_review_link} target="_blank" rel="noopener noreferrer" className="btn-gold mt-8 w-full">
              Leave a Google review
            </a>
          ) : (
            <p className="mt-8 text-sm text-blush-800/60">Reviews link coming soon.</p>
          )}
          <Link href={`/s/${slug}`} className="mt-4 block text-sm text-blush-500 hover:underline">
            Back to {salon.name}
          </Link>
        </div>
      </div>
    </StorefrontShell>
  );
}
