import "server-only";
import type { AiProvider } from "./provider";
import { createGeminiProvider } from "./gemini";
import { createAnthropicProvider } from "./anthropic";

let cached: AiProvider | null = null;

/**
 * Picks the chat model from env. Gemini stays the default so the existing
 * GEMINI_API_KEY keeps working; set AI_PROVIDER=anthropic to use Claude.
 */
export function getAiProvider(): AiProvider {
  if (cached) return cached;
  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();

  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic");
    cached = createAnthropicProvider(key, process.env.ANTHROPIC_MODEL ?? "claude-opus-5");
    return cached;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is required for the AI receptionist");
  cached = createGeminiProvider(key, process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  return cached;
}

export function isAiConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  return provider === "anthropic" ? !!process.env.ANTHROPIC_API_KEY : !!process.env.GEMINI_API_KEY;
}
