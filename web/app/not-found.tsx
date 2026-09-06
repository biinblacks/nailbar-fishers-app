import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="glass-card max-w-md p-10 text-center">
        <p className="section-eyebrow">404</p>
        <h1 className="mt-2 text-2xl font-bold text-blush-900">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-blush-800/70">
          The salon may not exist, or you may not have access to it.
        </p>
        <Link href="/app" className="btn-primary mt-6">
          Back to my salons
        </Link>
      </div>
    </main>
  );
}
