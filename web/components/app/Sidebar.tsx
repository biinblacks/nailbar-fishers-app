"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  Images,
  Inbox,
  LayoutDashboard,
  Languages,
  BellRing,
  Scissors,
  Settings,
  Users,
  UserRound,
  LogOut,
} from "lucide-react";
import type { Salon, SalonRole } from "@/lib/types";

interface Props {
  salon: Salon;
  role: SalonRole;
  userEmail: string;
  salons: Array<{ salon: Salon; role: SalonRole }>;
}

export function navItems(slug: string) {
  const base = `/app/${slug}`;
  return [
    { href: base, label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: `${base}/appointments`, label: "Appointments", icon: CalendarDays },
    { href: `${base}/customers`, label: "Customers", icon: Users },
    { href: `${base}/interpreter`, label: "Interpreter", icon: Languages },
    { href: `${base}/services`, label: "Services", icon: Scissors },
    { href: `${base}/staff`, label: "Staff", icon: UserRound },
    { href: `${base}/inbox`, label: "Inbox", icon: Inbox },
    { href: `${base}/receptionist`, label: "AI Receptionist", icon: Bot },
    { href: `${base}/gallery`, label: "Gallery", icon: Images },
    { href: `${base}/automations`, label: "Automations", icon: BellRing },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];
}

export function Sidebar({ salon, role, userEmail, salons }: Props) {
  const pathname = usePathname();
  const items = navItems(salon.slug);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-blush-100 bg-white p-5 md:flex">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold-500">Salon</p>
        {salons.length > 1 ? (
          <SalonSwitcher current={salon} salons={salons} />
        ) : (
          <p className="mt-1 truncate text-lg font-serif font-bold text-blush-700">{salon.name}</p>
        )}
        <p className="mt-0.5 text-xs capitalize text-blush-800/60">{role}</p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-blush-500 text-white shadow-soft" : "text-blush-800 hover:bg-blush-50"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-blush-100 pt-4">
        <p className="truncate text-xs text-blush-800/60" title={userEmail}>
          {userEmail}
        </p>
        <form action="/auth/signout" method="post" className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-blush-500 transition hover:bg-blush-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function SalonSwitcher({
  current,
  salons,
}: {
  current: Salon;
  salons: Array<{ salon: Salon; role: SalonRole }>;
}) {
  return (
    <select
      aria-label="Switch salon"
      className="input-field mt-1 font-serif text-base font-bold text-blush-700"
      defaultValue={current.slug}
      onChange={(e) => {
        window.location.assign(`/app/${e.target.value}`);
      }}
    >
      {salons.map(({ salon }) => (
        <option key={salon.id} value={salon.slug}>
          {salon.name}
        </option>
      ))}
    </select>
  );
}
