import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManageSalon, requireSalonAccess } from "@/lib/salon";
import { localParts } from "@/lib/time";
import { disconnectMetaAction, updatePostStatusAction } from "@/actions/marketing";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton, MetaConnectForm, SchedulePostForm } from "@/components/forms/MarketingForms";
import { ConfirmButton } from "@/components/forms/ConfirmButton";

export const metadata: Metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";

const POST_STATUS: Record<string, string> = {
  scheduled: "border-gold-200 bg-gold-50 text-gold-700",
  ready: "border-blush-200 bg-blush-50 text-blush-600",
  published: "border-green-200 bg-green-50 text-green-700",
  failed: "border-red-200 bg-red-50 text-red-600",
  cancelled: "border-gray-200 bg-gray-100 text-gray-500",
};

export default async function MarketingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { salon, role } = await requireSalonAccess(slug);
  const supabase = await createClient();
  const canEdit = canManageSalon(role);

  const [campaignsRes, postsRes, metaRes, favRes] = await Promise.all([
    supabase.from("campaigns").select("id, name, goal, platforms, languages, status, created_at").eq("salon_id", salon.id).neq("status", "archived").order("created_at", { ascending: false }).limit(50),
    supabase.from("scheduled_posts").select("id, platform, content, scheduled_for, status, publish_mode, error, external_id").eq("salon_id", salon.id).in("status", ["scheduled", "ready", "failed"]).order("scheduled_for").limit(50),
    canEdit ? supabase.from("salon_integrations").select("external_id, display_name, instagram_account_id, updated_at").eq("salon_id", salon.id).eq("provider", "meta").maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("campaign_assets").select("id, kind, language, content").eq("salon_id", salon.id).eq("is_favorite", true).in("kind", ["caption", "promo"]).order("updated_at", { ascending: false }).limit(20),
  ]);
  const campaigns = campaignsRes.data ?? [];
  const posts = postsRes.data ?? [];
  const meta = metaRes.data;
  const readyPosts = posts.filter((p) => p.status === "ready");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI marketing"
        title="Marketing"
        description="Generate captions, promotions, image and video prompts in English and Vietnamese, then schedule posts."
        actions={canEdit ? <LinkButton href={`/app/${slug}/marketing/new`}>New campaign</LinkButton> : undefined}
      />

      {readyPosts.length > 0 && (
        <Card className="border-2 border-blush-300">
          <h2 className="text-lg font-semibold text-blush-900">Ready to post now</h2>
          <p className="mt-1 text-xs text-blush-800/60">Copy the text, post it on the platform, then mark it published.</p>
          <ul className="mt-4 space-y-3">
            {readyPosts.map((p) => (
              <li key={p.id} className="rounded-2xl border border-blush-100 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-blush-800/60">
                  <span className="capitalize">{p.platform} · {new Date(p.scheduled_for).toLocaleString("en-US")}</span>
                  <span className="flex items-center gap-3">
                    <CopyButton text={p.content} />
                    <form action={updatePostStatusAction}>
                      <input type="hidden" name="slug" value={slug} />
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="published" />
                      <button type="submit" className="btn-primary !px-3 !py-1 text-xs">
                        Mark published
                      </button>
                    </form>
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-blush-900">{p.content}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-blush-900">Campaigns</h2>
          {campaigns.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No campaigns yet" description="Describe a goal and get a full content pack in seconds." action={canEdit ? <LinkButton href={`/app/${slug}/marketing/new`}>Create your first campaign</LinkButton> : undefined} />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-blush-50">
              {campaigns.map((c) => (
                <li key={c.id} className="py-3">
                  <Link href={`/app/${slug}/marketing/${c.id}`} className="font-medium text-blush-900 hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-xs text-blush-800/60">
                    {c.platforms.join(", ")} · {c.languages.join("/")} · {new Date(c.created_at).toLocaleDateString("en-US")}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-blush-800/80">{c.goal}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {canEdit && (
          <Card className="h-fit">
            <h2 className="text-lg font-semibold text-blush-900">Connections</h2>
            {meta ? (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-blush-900">
                  Facebook Page: <strong>{meta.display_name ?? meta.external_id}</strong>
                </p>
                <p className="text-xs text-blush-800/60">Instagram: {meta.instagram_account_id ? "linked" : "not linked"} · updated {new Date(meta.updated_at).toLocaleDateString("en-US")}</p>
                <ConfirmButton action={disconnectMetaAction} hidden={{ slug }} confirmText="Disconnect the Facebook Page? Scheduled auto posts will fail." variant="secondary" className="!px-3 !py-1 text-xs">
                  Disconnect
                </ConfirmButton>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs text-blush-800/60">Connect a Facebook Page to auto-publish. Without it, scheduled posts show up here as reminders.</p>
                <div className="mt-3">
                  <MetaConnectForm slug={slug} />
                </div>
              </>
            )}
          </Card>
        )}
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-blush-900">Scheduled posts</h2>
        {posts.length === 0 ? (
          <p className="mt-3 text-sm text-blush-800/60">Nothing scheduled.</p>
        ) : (
          <div className="table-shell mt-4">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Platform</th>
                  <th>Text</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap">{new Date(p.scheduled_for).toLocaleString("en-US")}</td>
                    <td className="capitalize">{p.platform} · {p.publish_mode}</td>
                    <td className="max-w-md truncate">{p.content}</td>
                    <td>
                      <Badge className={POST_STATUS[p.status] ?? POST_STATUS.cancelled}>{p.status}</Badge>
                      {p.error && <span className="block text-xs text-red-500">{p.error}</span>}
                    </td>
                    <td className="text-right">
                      {p.status !== "published" && (
                        <ConfirmButton action={updatePostStatusAction} hidden={{ slug, id: p.id, status: "cancelled" }} confirmText="Cancel this post?" variant="secondary" className="!px-3 !py-1 text-xs">
                          Cancel
                        </ConfirmButton>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-blush-500">Schedule a post from your favorites</summary>
          <div className="mt-3">
            <SchedulePostForm slug={slug} assets={favRes.data ?? []} metaConnected={!!meta} defaultDate={localParts(new Date(), salon.timezone).date} />
          </div>
        </details>
      </Card>
    </div>
  );
}
