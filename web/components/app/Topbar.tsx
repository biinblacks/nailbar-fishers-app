import Link from "next/link";
import type { Salon } from "@/lib/types";

export function Topbar({ salon }: { salon: Salon }) {
  return (
    <header className="flex items-center justify-between border-b border-blush-100 bg-white/80 px-4 py-3 backdrop-blur md:hidden">
      <Link href={`/app/${salon.slug}`} className="font-serif text-lg font-bold text-blush-700">
        {salon.name}
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className="text-xs font-medium text-blush-500">
          Sign out
        </button>
      </form>
    </header>
  );
}
