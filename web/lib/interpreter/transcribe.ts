import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { languageByCode } from "./languages";

/**
 * Server-side speech-to-text fallback for browsers without the Web Speech
 * API (Firefox, some in-app browsers). Uses Gemini's audio understanding;
 * requires GEMINI_API_KEY regardless of the chat provider.
 */
export function isTranscriptionAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export async function transcribeAudio(audio: ArrayBuffer, mimeType: string, langCode: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Transcription is not configured (GEMINI_API_KEY missing).");
  const lang = languageByCode(langCode);
  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: process.env.GEMINI_TRANSCRIBE_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    generationConfig: { temperature: 0, maxOutputTokens: 400 },
  });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: Buffer.from(audio).toString("base64") } },
    {
      text: `Transcribe this short ${lang.name} voice message from a nail salon verbatim. Output only the spoken words in ${lang.name}, with normal punctuation. If there is no speech, output an empty string.`,
    },
  ]);
  return result.response.text().trim();
}
