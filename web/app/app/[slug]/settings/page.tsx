import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import type { BusinessHour, Profile, SalonMembership } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SalonProfileForm } from "@/components/forms/SalonProfileForm";
import { HoursForm } from "@/components/forms/HoursForm";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon, role } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const canEdit = canManageSalon(role);

  const [hoursRes, membersRes] = await Promise.all([
    supabase.from("business_hours").select("*").eq("salon_id", salon.id).order("day_of_week"),
    supabase.from("salon_members").select("*, profiles(full_name, email)").eq("salon_id", salon.id).order("created_at"),
  ]);
  const hours = (hoursRes.data ?? []) as BusinessHour[];
  const members = (membersRes.data ?? []) as Array<SalonMembership & { profiles: Profile | null }>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Salon profile"
        description="This information powers your storefront, booking page, and the AI receptionist's answers."
      />

      {!canEdit && (
        <p className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-800">
          You have staff access. Ask an owner or admin to change salon settings.
        </p>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Profile &amp; contact</h2>
        <p className="mt-1 text-xs text-blush-800/60">
          Dashboard URL: <code className="rounded bg-blush-50 px-1.5 py-0.5">/app/{salon.slug}</code>
        </p>
        <div className="mt-5">
          <SalonProfileForm salon={salon} canEdit={canEdit} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Business hours</h2>
        <p className="mt-1 text-xs text-blush-800/60">
          Times are in {salon.timezone}. The AI receptionist quotes these to customers.
        </p>
        <div className="mt-5">
          <HoursForm slug={salon.slug} hours={hours} canEdit={canEdit} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Team access</h2>
        <p className="mt-1 text-xs text-blush-800/60">
          People who can sign in to this dashboard. Invitations arrive in Phase 2; for now, add
          members by inserting into <code>salon_members</code>.
        </p>
        <ul className="mt-4 divide-y divide-blush-50">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-blush-900">{m.profiles?.full_name || m.profiles?.email || m.user_id}</p>
                {m.profiles?.full_name && <p className="text-xs text-blush-800/60">{m.profiles.email}</p>}
              </div>
              <span className="rounded-full bg-blush-50 px-3 py-1 text-xs font-medium capitalize text-blush-600">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
