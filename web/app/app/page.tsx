import Link from "next/link";
import { redirect } from "next/navigation";
import { listMySalons } from "@/lib/salon";
import { LinkButton } from "@/components/ui/Button";

// Entry point after sign-in: send the user to their salon, or onboarding.
export default async function AppIndexPage() {
  const salons = await listMySalons();

  if (salons.length === 0) redirect("/app/new");
  if (salons.length === 1) redirect(`/app/${salons[0].salon.slug}`);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <span className="section-eyebrow">Your salons</span>
      <h1 className="mt-2 text-3xl font-bold text-blush-900">Choose a salon</h1>
      <ul className="mt-8 space-y-3">
        {salons.map(({ salon, role }) => (
          <li key={salon.id}>
            <Link
              href={`/app/${salon.slug}`}
              className="glass-card flex items-center justify-between p-5 transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div>
                <p className="font-serif text-lg font-semibold text-blush-900">{salon.name}</p>
                <p className="text-xs text-blush-800/60">{salon.address ?? salon.slug}</p>
              </div>
              <span className="rounded-full bg-blush-50 px-3 py-1 text-xs font-medium capitalize text-blush-600">
                {role}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <LinkButton href="/app/new" variant="secondary">
          Add another salon
        </LinkButton>
      </div>
    </main>
  );
}
