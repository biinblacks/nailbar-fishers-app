import { NextResponse, type NextRequest } from "next/server";
import { runAutomations } from "@/lib/automations/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Automation worker. Vercel Cron calls this every 15 minutes (see vercel.json)
 * with `Authorization: Bearer $CRON_SECRET`. Any other scheduler works too —
 * just send the same header. Runs planning + sending for every salon.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : request.headers.get("x-cron-secret") ?? "";
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  try {
    const summary = await runAutomations({ siteUrl });
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[automations] run failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "run failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
