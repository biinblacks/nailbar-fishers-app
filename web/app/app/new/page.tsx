import type { Metadata } from "next";
import Link from "next/link";
import { listMySalons } from "@/lib/salon";
import { CreateSalonForm } from "@/components/forms/CreateSalonForm";

export const metadata: Metadata = { title: "Create your salon" };

export default async function NewSalonPage() {
  const existing = await listMySalons();

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <span className="section-eyebrow">{existing.length ? "New salon" : "Welcome"}</span>
      <h1 className="mt-2 text-3xl font-bold text-blush-900">
        {existing.length ? "Add another salon" : "Set up your salon"}
      </h1>
      <p className="mt-2 text-sm text-blush-800/70">
        Each salon gets its own team, services, customers, and appointment calendar.
      </p>
      <div className="glass-card mt-8 p-8">
        <CreateSalonForm />
      </div>
      {existing.length > 0 && (
        <p className="mt-6 text-center text-sm">
          <Link href="/app" className="text-blush-500 hover:underline">
            Back to my salons
          </Link>
        </p>
      )}
    </main>
  );
}
