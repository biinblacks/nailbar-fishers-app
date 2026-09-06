import { NextResponse, type NextRequest } from "next/server";
import { getSalonAccessForApi } from "@/lib/salon-api";
import { isTranscriptionAvailable, transcribeAudio } from "@/lib/interpreter/transcribe";
import { LANGUAGE_CODES } from "@/lib/interpreter/languages";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

// multipart/form-data: slug, lang, audio (webm/ogg/mp4/wav, <= 4 MB, ~30 s)
export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const slug = String(form?.get("slug") ?? "");
  const lang = String(form?.get("lang") ?? "");
  const audio = form?.get("audio");
  if (!form || !slug || !LANGUAGE_CODES.includes(lang) || !(audio instanceof Blob)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (audio.size === 0 || audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording is empty or too large" }, { status: 413 });
  }

  const access = await getSalonAccessForApi(slug);
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isTranscriptionAvailable()) return NextResponse.json({ error: "Server transcription is not configured" }, { status: 503 });

  const limit = await rateLimit(`transcribe:${access.userId}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many recordings per minute" }, { status: 429 });

  try {
    const text = await transcribeAudio(await audio.arrayBuffer(), audio.type || "audio/webm", lang);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[interpreter] transcribe failed", err);
    return NextResponse.json({ error: "Could not transcribe the recording." }, { status: 502 });
  }
}
