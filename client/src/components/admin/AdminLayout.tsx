import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Appointments" },
  { to: "/admin/services", label: "Services" },
  { to: "/admin/hours", label: "Business Hours" },
  { to: "/admin/staff", label: "Staff" },
  { to: "/admin/knowledge", label: "AI Knowledge" },
  { to: "/admin/messages", label: "Customer Messages" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/admin/login");
  }

  return (
    <div className="min-h-screen bg-blush-50/40">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-blush-100 bg-white p-6 md:flex">
          <p className="text-xl font-serif font-bold text-blush-600">
            Luxe <span className="text-gold-500">Admin</span>
          </p>
          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-blush-500 text-white"
                      : "text-blush-800 hover:bg-blush-50"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={handleSignOut}
            className="mt-auto rounded-xl px-4 py-2.5 text-left text-sm font-medium text-blush-500 transition hover:bg-blush-50"
          >
            Sign Out
          </button>
        </aside>

        <main className="flex-1 overflow-x-hidden p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
