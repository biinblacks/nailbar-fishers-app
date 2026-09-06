import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/salon";
import { AcceptInviteForm } from "@/components/forms/AcceptInviteForm";

export const metadata: Metadata = { title: "Team invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/invite/${token}`);

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_salon_invite", { p_token: token });
  const invite = data?.[0];

  const emailMatches = invite && user.email?.toLowerCase() === invite.email.toLowerCase();
  const expired = invite && new Date(invite.expires_at) < new Date();

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="glass-card w-full max-w-md p-8 text-center">
        <span className="section-eyebrow">Team invitation</span>
        {!invite ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-blush-900">This invite link is not valid</h1>
            <p className="mt-2 text-sm text-blush-800/70">Ask the salon owner to send a new invitation.</p>
          </>
        ) : invite.accepted_at ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-blush-900">Already accepted</h1>
            <Link href={`/app/${invite.salon_slug}`} className="btn-primary mt-6">
              Open {invite.salon_name}
            </Link>
          </>
        ) : expired ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-blush-900">This invite has expired</h1>
            <p className="mt-2 text-sm text-blush-800/70">Ask the salon owner to send a new one.</p>
          </>
        ) : !emailMatches ? (
          <>
            <h1 className="mt-2 text-2xl font-bold text-blush-900">Wrong account</h1>
            <p className="mt-2 text-sm text-blush-800/70">
              This invite was sent to <strong>{invite.email}</strong>, but you are signed in as <strong>{user.email}</strong>.
            </p>
            <form action="/auth/signout" method="post" className="mt-6">
              <button type="submit" className="btn-secondary w-full">
                Sign out and switch account
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-bold text-blush-900">Join {invite.salon_name}</h1>
            <p className="mt-2 text-sm text-blush-800/70">
              You have been invited as <span className="font-medium capitalize">{invite.role}</span>.
            </p>
            <div className="mt-6">
              <AcceptInviteForm token={token} />
            </div>
          </>
        )}
        <Link href="/app" className="mt-6 block text-sm text-blush-500 hover:underline">
          Back to my salons
        </Link>
      </div>
    </main>
  );
}
