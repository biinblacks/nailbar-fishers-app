/**
 * TwiML builders for the phone receptionist.
 *
 * Twilio drives the call by fetching XML from us on every turn: we speak, we
 * open a <Gather> to listen, Twilio transcribes what the caller said and posts
 * it back. Pure string building with no Twilio SDK, so it runs anywhere and is
 * trivial to unit-test.
 *
 * Deliberately NOT "server-only": the tests import it directly.
 */

/** Voices that read Vietnamese and English naturally on Twilio's Polly tier. */
const VOICES: Record<VoiceLanguage, { voice: string; language: string }> = {
  en: { voice: "Polly.Joanna-Neural", language: "en-US" },
  vi: { voice: "Polly.Lien-Neural", language: "vi-VN" },
};

export type VoiceLanguage = "en" | "vi";

export function isVoiceLanguage(value: unknown): value is VoiceLanguage {
  return value === "en" || value === "vi";
}

/**
 * XML escaping for text that Twilio will parse as markup. Quotes are escaped
 * too because the same helper fills attribute values.
 */
export function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

/**
 * Twilio reads <Say> aloud, so anything that only makes sense in writing has
 * to go. Markdown, URLs and emoji all read terribly over a phone line.
 */
export function speakable(text: string, maxChars = 1200): string {
  const cleaned = text
    // Markdown emphasis and headings.
    .replace(/[*_#`]+/g, " ")
    // "text (https://…)" and bare links: the SMS follow-up carries the link.
    .replace(/\((https?:\/\/[^)]*)\)/g, " ")
    .replace(/https?:\/\/\S+/g, " our website ")
    // List bullets become sentence breaks so the voice pauses.
    .replace(/^\s*[-•]\s*/gm, ". ")
    // Emoji and pictographs.
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxChars) return cleaned;
  // Cut at a sentence boundary so the caller never hears a clipped word.
  const cut = cleaned.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return lastStop > maxChars * 0.5 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}.`;
}

function say(text: string, lang: VoiceLanguage): string {
  const { voice, language } = VOICES[lang];
  return `<Say voice="${voice}" language="${language}">${escapeXml(speakable(text))}</Say>`;
}

function wrap(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

export interface GatherOptions {
  /** Absolute URL Twilio posts the transcript to. */
  action: string;
  language: VoiceLanguage;
  /** Spoken before listening. Omit to listen straight away. */
  prompt?: string;
  /** Seconds of silence before Twilio gives up on this turn. */
  timeout?: number;
}

/**
 * Speak, then listen. `speechTimeout="auto"` lets Twilio decide the caller has
 * finished rather than waiting out a fixed timer, which is what makes the
 * back-and-forth feel like a conversation instead of a voicemail prompt.
 */
export function gatherSpeech({ action, language, prompt, timeout = 6 }: GatherOptions): string {
  const { language: locale } = VOICES[language];
  const inner =
    `<Gather input="speech" action="${escapeXml(action)}" method="POST"` +
    ` language="${locale}" speechTimeout="auto" timeout="${timeout}"` +
    ` speechModel="phone_call" profanityFilter="false" actionOnEmptyResult="true">` +
    (prompt ? say(prompt, language) : "") +
    `</Gather>`;
  return wrap(inner);
}

/** Speak a final message and hang up. */
export function sayAndHangup(text: string, language: VoiceLanguage): string {
  return wrap(`${say(text, language)}<Hangup/>`);
}

/**
 * Hand the caller to a human. `callerId` keeps the salon's own number on the
 * receiving handset; without it Twilio shows the guest's number and staff
 * cannot tell a transfer from a direct call.
 */
export function transfer(text: string, to: string, language: VoiceLanguage, callerId?: string | null): string {
  const dial = `<Dial timeout="25"${callerId ? ` callerId="${escapeXml(callerId)}"` : ""}>${escapeXml(to)}</Dial>`;
  return wrap(`${say(text, language)}${dial}`);
}

/** Empty 200 — tells Twilio "nothing to do", used for status callbacks. */
export function emptyTwiml(): string {
  return wrap("");
}
