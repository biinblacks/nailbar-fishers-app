import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPublicSalon } from "@/lib/storefront";
import { generateReceptionistReply } from "@/lib/ai/receptionist";
import { isAiConfigured } from "@/lib/ai";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { checkLimit } from "@/lib/billing/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z.string().min(3).max(48),
  sessionId: z.string().min(8).max(80),
  message: z.string().min(1).max(2000),
  channel: z.enum(["web", "embed"]).optional(),
});

// Public AI receptionist endpoint used by the storefront widget and the
// iframe embed. Anonymous; abuse-limited per IP and per session.
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const perIp = await rateLimit(`chat:ip:${ip}`, 30, 60_000);
  if (!perIp.ok) {
    return NextResponse.json({ error: "Too many messages. Please slow down." }, { status: 429, headers: { "Retry-After": String(perIp.retryAfterSeconds) } });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const perSession = await rateLimit(`chat:session:${body.sessionId}`, 200, 24 * 60 * 60_000);
  if (!perSession.ok) {
    return NextResponse.json({ error: "This chat has reached its daily limit. Please call the salon." }, { status: 429 });
  }

  const salon = await getPublicSalon(body.slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  if (!salon.ai_enabled || !isAiConfigured()) {
    return NextResponse.json({ error: "The AI receptionist is not available right now." }, { status: 503 });
  }

  const quota = await checkLimit(salon.id, "ai_messages");
  if (!quota.allowed) {
    return NextResponse.json({
      sessionId: body.sessionId,
      reply: `Our virtual receptionist is taking a short break. Please call us${salon.phone ? ` at ${salon.phone}` : ""} and we'll be happy to help.`,
      needsHuman: true,
      limitReached: true,
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const reply = await generateReceptionistReply(salon, body.sessionId, body.message, body.channel ?? "web", siteUrl);
  return NextResponse.json(reply);
}
