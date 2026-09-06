"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./Sidebar";
import type { Salon } from "@/lib/types";

export function MobileNav({ salon }: { salon: Salon }) {
  const pathname = usePathname();
  const items = navItems(salon.slug).filter((i) => !i.href.endsWith("/receptionist"));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-blush-100 bg-white/95 px-2 py-2 backdrop-blur md:hidden"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-medium ${
              active ? "text-blush-600" : "text-blush-800/60"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
