import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishDuePosts } from "@/lib/marketing/publisher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Publishes due social posts. Same CRON_SECRET guard as /api/cron/automations. */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-cron-secret") ?? "";
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const summary = await publishDuePosts(createAdminClient(), new Date());
    return NextResponse.json({ ...summary, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error("[publish] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "run failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
