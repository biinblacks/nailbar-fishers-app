import { describe, expect, it } from "vitest";
import { escapeXml, gatherSpeech, sayAndHangup, speakable, transfer, isVoiceLanguage } from "@/lib/voice/twiml";

describe("escapeXml", () => {
  it("escapes every character that would break the TwiML document", () => {
    expect(escapeXml(`<b>Tom & "Jerry's"</b>`)).toBe("&lt;b&gt;Tom &amp; &quot;Jerry&apos;s&quot;&lt;/b&gt;");
  });

  it("leaves Vietnamese diacritics alone", () => {
    expect(escapeXml("Chào chị! Hôm nay làm gì ạ?")).toBe("Chào chị! Hôm nay làm gì ạ?");
  });
});

describe("speakable", () => {
  it("strips markdown that would be read out character by character", () => {
    expect(speakable("**Gel X** is *$65*")).toBe("Gel X is $65");
  });

  it("replaces links, which cannot be read over the phone", () => {
    expect(speakable("Book at https://example.com/s/nail-bar/book today")).toBe("Book at our website today");
  });

  it("drops a markdown link's URL but keeps the sentence", () => {
    expect(speakable("Book here (https://example.com/book) anytime")).toBe("Book here anytime");
  });

  it("turns bullets into sentence breaks so the voice pauses", () => {
    expect(speakable("- Manicure\n- Pedicure")).toBe(". Manicure . Pedicure");
  });

  it("removes emoji", () => {
    expect(speakable("Thanks! 💅✨")).toBe("Thanks!");
  });

  it("cuts long replies at a sentence boundary", () => {
    const long = `${"We offer many services. ".repeat(20)}Trailing clause that runs on`;
    const out = speakable(long, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith(".")).toBe(true);
    // Never ends mid-word.
    expect(out).not.toMatch(/\s\w{1,3}\.$/);
  });

  it("leaves a short reply untouched", () => {
    expect(speakable("We open at nine thirty.")).toBe("We open at nine thirty.");
  });
});

describe("gatherSpeech", () => {
  it("produces a well-formed Gather that listens for speech", () => {
    const out = gatherSpeech({ action: "https://x.test/api/webhooks/twilio/voice/turn", language: "en", prompt: "Hi there" });
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?><Response>')).toBe(true);
    expect(out).toContain('input="speech"');
    expect(out).toContain('speechTimeout="auto"');
    expect(out).toContain('actionOnEmptyResult="true"');
    expect(out).toContain("<Say");
    expect(out).toContain("Hi there");
    expect(out.endsWith("</Response>")).toBe(true);
  });

  it("escapes the action URL so a query string cannot break the attribute", () => {
    const out = gatherSpeech({ action: "https://x.test/turn?silent=1&a=2", language: "en" });
    expect(out).toContain("silent=1&amp;a=2");
    expect(out).not.toContain("silent=1&a=2");
  });

  it("uses the Vietnamese voice and locale when the salon runs in Vietnamese", () => {
    const out = gatherSpeech({ action: "https://x.test/turn", language: "vi", prompt: "Xin chào" });
    expect(out).toContain('language="vi-VN"');
    expect(out).toContain("Polly.Lien-Neural");
  });

  it("omits Say entirely when there is nothing to speak", () => {
    expect(gatherSpeech({ action: "https://x.test/turn", language: "en" })).not.toContain("<Say");
  });
});

describe("sayAndHangup", () => {
  it("speaks then hangs up", () => {
    const out = sayAndHangup("Goodbye", "en");
    expect(out).toContain("Goodbye");
    expect(out).toContain("<Hangup/>");
    expect(out.indexOf("<Say")).toBeLessThan(out.indexOf("<Hangup/>"));
  });
});

describe("transfer", () => {
  it("dials the human and keeps the salon number as caller ID", () => {
    const out = transfer("One moment", "+13175550182", "en", "+13175551234");
    expect(out).toContain("<Dial");
    expect(out).toContain('callerId="+13175551234"');
    expect(out).toContain("+13175550182");
  });

  it("omits callerId when the salon has no number to present", () => {
    expect(transfer("One moment", "+13175550182", "en", null)).not.toContain("callerId");
  });
});

describe("isVoiceLanguage", () => {
  it("accepts the two supported languages and rejects anything else", () => {
    expect(isVoiceLanguage("en")).toBe(true);
    expect(isVoiceLanguage("vi")).toBe(true);
    expect(isVoiceLanguage("fr")).toBe(false);
    expect(isVoiceLanguage(null)).toBe(false);
    expect(isVoiceLanguage(undefined)).toBe(false);
  });
});
