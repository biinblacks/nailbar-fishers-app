import type { Metadata } from "next";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import type { BusinessHour, Profile, SalonMembership } from "@/lib/types";
import { removeMemberAction, revokeInviteAction, updateMemberRoleAction } from "@/actions/team";
import { removeLogoAction, uploadLogoAction } from "@/actions/media";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SalonProfileForm } from "@/components/forms/SalonProfileForm";
import { HoursForm } from "@/components/forms/HoursForm";
import { InviteForm } from "@/components/forms/InviteForm";
import { ImageUploadForm } from "@/components/forms/ImageUploadForm";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon, role, userId } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const canEdit = canManageSalon(role);
  const isOwner = role === "owner";

  const [hoursRes, membersRes, invitesRes] = await Promise.all([
    supabase.from("business_hours").select("*").eq("salon_id", salon.id).order("day_of_week"),
    supabase.from("salon_members").select("*, profiles(id, full_name, email, avatar_url)").eq("salon_id", salon.id).order("created_at"),
    supabase.from("salon_invites").select("id, email, role, token, expires_at, created_at").eq("salon_id", salon.id).is("accepted_at", null).order("created_at", { ascending: false }),
  ]);
  const hours = (hoursRes.data ?? []) as BusinessHour[];
  const members = (membersRes.data ?? []) as unknown as Array<SalonMembership & { profiles: Profile | null }>;
  const invites = invitesRes.data ?? [];
  const ownerCount = members.filter((m) => m.role === "owner").length;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-blush-900">Profile &amp; contact</h2>
          <p className="mt-1 text-xs text-blush-800/60">
            Public page: <a href={`/s/${salon.slug}`} target="_blank" rel="noreferrer" className="text-blush-500 hover:underline">{`/s/${salon.slug}`}</a>
          </p>
          <div className="mt-5">
            <SalonProfileForm salon={salon} canEdit={canEdit} />
          </div>
        </Card>

        <Card className="h-fit">
          <h2 className="text-lg font-semibold text-blush-900">Logo</h2>
          <div className="mt-4 flex items-center gap-4">
            {salon.logo_url ? (
              <Image src={salon.logo_url} alt={`${salon.name} logo`} width={96} height={96} className="h-24 w-24 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-blush-50 font-serif text-2xl font-bold text-blush-400">
                {salon.name.slice(0, 1)}
              </div>
            )}
            {salon.logo_url && canEdit && (
              <ConfirmButton action={removeLogoAction} hidden={{ slug }} confirmText="Remove the logo?" variant="secondary" className="!px-3 !py-1.5 text-xs">
                Remove
              </ConfirmButton>
            )}
          </div>
          {canEdit && (
            <div className="mt-4">
              <ImageUploadForm action={uploadLogoAction} hidden={{ slug }} label="Upload a new logo" buttonText="Save logo" />
            </div>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Business hours</h2>
        <p className="mt-1 text-xs text-blush-800/60">Times are in {salon.timezone}. The AI receptionist and online booking use these.</p>
        <div className="mt-5">
          <HoursForm slug={salon.slug} hours={hours} canEdit={canEdit} />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Team</h2>
        <p className="mt-1 text-xs text-blush-800/60">People who can sign in to this dashboard.</p>

        <ul className="mt-4 divide-y divide-blush-50">
          {members.map((m) => {
            const name = m.profiles?.full_name || m.profiles?.email || m.user_id;
            const isSelf = m.user_id === userId;
            const lastOwner = m.role === "owner" && ownerCount <= 1;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-blush-900">
                    {name} {isSelf && <span className="text-xs text-blush-800/50">(you)</span>}
                  </p>
                  {m.profiles?.full_name && <p className="truncate text-xs text-blush-800/60">{m.profiles.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {isOwner && !lastOwner ? (
                    <form action={updateMemberRoleAction} className="flex items-center gap-1">
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <select name="role" defaultValue={m.role} aria-label="Role" className="input-field !w-auto !py-1 text-xs">
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                      </select>
                      <button type="submit" className="text-xs font-medium text-blush-500 hover:underline">
                        Update
                      </button>
                    </form>
                  ) : (
                    <Badge className="border-blush-100 bg-blush-50 capitalize text-blush-600">{m.role}</Badge>
                  )}
                  {(isOwner || isSelf) && !lastOwner && (
                    <ConfirmButton
                      action={removeMemberAction}
                      hidden={{ slug, user_id: m.user_id }}
                      confirmText={isSelf ? "Leave this salon?" : `Remove ${name} from the team?`}
                      variant="secondary"
                      className="!px-3 !py-1 text-xs"
                    >
                      {isSelf ? "Leave" : "Remove"}
                    </ConfirmButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {invites.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blush-800/60">Pending invitations</h3>
            <ul className="mt-2 divide-y divide-blush-50">
              {invites.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-blush-900">{inv.email}</p>
                    <p className="text-xs text-blush-800/60">
                      <span className="capitalize">{inv.role}</span> · expires {new Date(inv.expires_at).toLocaleDateString("en-US")}
                    </p>
                    {canEdit && (
                      <code className="mt-1 block max-w-full truncate rounded bg-blush-50 px-1.5 py-0.5 text-[11px] text-blush-800/70">{`${siteUrl}/invite/${inv.token}`}</code>
                    )}
                  </div>
                  {canEdit && (
                    <ConfirmButton action={revokeInviteAction} hidden={{ slug, id: inv.id }} confirmText={`Revoke the invite for ${inv.email}?`} variant="secondary" className="!px-3 !py-1 text-xs">
                      Revoke
                    </ConfirmButton>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canEdit && (
          <div className="mt-6 border-t border-blush-50 pt-5">
            <InviteForm slug={slug} myRole={role} />
          </div>
        )}
      </Card>
    </div>
  );
}
