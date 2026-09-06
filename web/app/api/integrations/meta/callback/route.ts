import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForUserToken, listPages, META_SCOPES, metaConfigured } from "@/lib/marketing/meta-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function back(base: string, path: string, message: string, ok = false): NextResponse {
  return NextResponse.redirect(`${base}${path}?${ok ? "connected" : "error"}=${encodeURIComponent(message)}`);
}

/**
 * Facebook OAuth callback: verifies the state, swaps the code for a
 * long-lived token, and stores the first Page (the owner can switch pages
 * afterwards from Marketing → Connections).
 */
export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";
  const code = params.get("code");
  const db = createAdminClient();

  const { data: stored } = await db.from("oauth_states").select("*").eq("state", state).eq("provider", "meta").maybeSingle();
  if (!stored) return back(base, "/app", "This connection link has expired. Please try again.");
  await db.from("oauth_states").delete().eq("state", state);

  const target = stored.redirect_to ?? "/app";
  if (new Date(stored.expires_at) < new Date()) return back(base, target, "The connection link expired. Please try again.");
  if (!metaConfigured()) return back(base, target, "Facebook app is not configured.");

  // The person who started the flow must be the one finishing it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== stored.user_id) return back(base, target, "Please sign in as the person who started the connection.");

  if (params.get("error") || !code) {
    return back(base, target, params.get("error_description") ?? "Facebook connection was cancelled.");
  }

  try {
    const userToken = await exchangeCodeForUserToken(code, `${base}/api/integrations/meta/callback`);
    const pages = await listPages(userToken);
    if (pages.length === 0) return back(base, target, "No Facebook Pages found on that account.");

    const page = pages[0];
    const { error } = await db.from("salon_integrations").upsert(
      {
        salon_id: stored.salon_id,
        provider: "meta",
        external_id: page.id,
        display_name: page.name,
        access_token: page.access_token,
        instagram_account_id: page.instagram_business_account?.id ?? null,
        user_access_token: userToken,
        scopes: META_SCOPES,
        connected_via: "oauth",
        connected_by: user.id,
      },
      { onConflict: "salon_id,provider" }
    );
    if (error) return back(base, target, "Could not save the connection.");

    await db.from("audit_log").insert({
      salon_id: stored.salon_id,
      user_id: user.id,
      action: "integration.connect",
      entity: "meta",
      entity_id: page.id,
      meta: { via: "oauth", pages: pages.length },
    });

    return back(base, target, pages.length > 1 ? `Connected ${page.name}. You can switch Pages below.` : `Connected ${page.name}.`, true);
  } catch (err) {
    return back(base, target, err instanceof Error ? err.message : "Facebook connection failed.");
  }
}
