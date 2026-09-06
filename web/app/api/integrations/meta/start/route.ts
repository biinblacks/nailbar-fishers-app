import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSalonAccessForApi } from "@/lib/salon-api";
import { canManageSalon } from "@/lib/salon";
import { metaAuthUrl, metaConfigured } from "@/lib/marketing/meta-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectUri(request: NextRequest): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  return `${base}/api/integrations/meta/callback`;
}

/** Starts the Facebook OAuth flow for a salon (owners and admins only). */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const access = await getSalonAccessForApi(slug);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageSalon(access.role)) return NextResponse.json({ error: "Only owners and admins can connect Facebook" }, { status: 403 });
  if (!metaConfigured()) return NextResponse.json({ error: "Facebook app is not configured (META_APP_ID / META_APP_SECRET)" }, { status: 503 });

  const state = crypto.randomBytes(24).toString("hex");
  const { error } = await createAdminClient().from("oauth_states").insert({
    state,
    salon_id: access.salon.id,
    user_id: access.userId,
    provider: "meta",
    redirect_to: `/app/${slug}/marketing`,
  });
  if (error) return NextResponse.json({ error: "Could not start the connection" }, { status: 500 });

  return NextResponse.redirect(metaAuthUrl(state, redirectUri(request)));
}
