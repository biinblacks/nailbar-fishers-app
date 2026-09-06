import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSalonAccessForApi } from "@/lib/salon-api";
import { translateText } from "@/lib/interpreter/translate";
import { LANGUAGE_CODES } from "@/lib/interpreter/languages";
import { isAiConfigured } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  slug: z.string().min(3).max(48),
  text: z.string().min(1).max(1500),
  from: z.enum(LANGUAGE_CODES as [string, ...string[]]),
  to: z.enum(LANGUAGE_CODES as [string, ...string[]]),
  speaker: z.enum(["a", "b"]).optional(),
});

// Signed-in salon members only: the interpreter is a staff tool.
export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const access = await getSalonAccessForApi(body.slug);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAiConfigured()) return NextResponse.json({ error: "AI provider is not configured" }, { status: 503 });

  const limit = await rateLimit(`translate:${access.userId}`, 90, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Slow down a little — too many translations per minute." }, { status: 429 });

  if (body.from === body.to) return NextResponse.json({ translation: body.text });

  try {
    const translation = await translateText({ ...body, salonName: access.salon.name });
    return NextResponse.json({ translation });
  } catch (err) {
    console.error("[interpreter] translate failed", err);
    return NextResponse.json({ error: "Translation failed. Please try again." }, { status: 502 });
  }
}
