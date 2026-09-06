import { NextResponse, type NextRequest } from "next/server";
import { getPublicSalon } from "@/lib/storefront";
import { computeSlots, isValidDate } from "@/lib/availability";
import { loadDayContext, rulesFor } from "@/lib/booking";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTime } from "@/lib/format";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

// GET /api/salons/:slug/availability?date=YYYY-MM-DD&service=<uuid>&staff=<uuid>
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const limit = rateLimit(`avail:${clientIp(request.headers)}`, 120, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { slug } = await params;
  const sp = request.nextUrl.searchParams;
  const date = sp.get("date") ?? "";
  const serviceId = sp.get("service") ?? "";
  const staffId = sp.get("staff") || null;

  if (!isValidDate(date) || !UUID_RE.test(serviceId) || (staffId && !UUID_RE.test(staffId))) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const salon = await getPublicSalon(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const { data: service } = await createAdminClient()
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .eq("salon_id", salon.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  const day = await loadDayContext(salon.id, date);
  const { slots, reason } = computeSlots({
    date,
    durationMinutes: service.duration_minutes as number,
    staffId,
    activeStaffIds: day.staff.map((s) => s.id),
    hours: day.hours,
    busy: day.busy,
    rules: rulesFor(salon),
  });

  return NextResponse.json({
    date,
    reason: reason ?? null,
    slots: slots.map((s) => ({ time: s.time, label: formatTime(s.time), staffIds: s.freeStaffIds })),
  });
}
