import { getCurrentUser, listMySalons, requireSalonAccess } from "@/lib/salon";
import { Sidebar } from "@/components/app/Sidebar";
import { MobileNav } from "@/components/app/MobileNav";
import { Topbar } from "@/components/app/Topbar";

export default async function SalonLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ salon, role }, user, salons] = await Promise.all([
    requireSalonAccess(slug),
    getCurrentUser(),
    listMySalons(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar salon={salon} role={role} userEmail={user?.email ?? ""} salons={salons} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar salon={salon} />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-10 md:pt-10">{children}</main>
      </div>
      <MobileNav salon={salon} />
    </div>
  );
}
