import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySvixSignature, verifyTwilioSignature } from "@/lib/webhooks/verify";

const TOKEN = "test-auth-token";
const URL_ = "https://salon.example.com/api/webhooks/twilio/inbound";

function twilioSign(url: string, params: Record<string, string>): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return crypto.createHmac("sha1", TOKEN).update(Buffer.from(data, "utf8")).digest("base64");
}

describe("verifyTwilioSignature", () => {
  const params = { From: "+13175550182", To: "+13175550100", Body: "Hi, are you open?", MessageSid: "SM123" };

  it("accepts a correctly signed request", () => {
    expect(verifyTwilioSignature(URL_, params, twilioSign(URL_, params), TOKEN)).toBe(true);
  });
  it("rejects a tampered body", () => {
    const sig = twilioSign(URL_, params);
    expect(verifyTwilioSignature(URL_, { ...params, Body: "changed" }, sig, TOKEN)).toBe(false);
  });
  it("rejects a different url, a wrong token, and a missing signature", () => {
    const sig = twilioSign(URL_, params);
    expect(verifyTwilioSignature("https://evil.example.com/hook", params, sig, TOKEN)).toBe(false);
    expect(verifyTwilioSignature(URL_, params, sig, "other-token")).toBe(false);
    expect(verifyTwilioSignature(URL_, params, null, TOKEN)).toBe(false);
  });
});

describe("verifySvixSignature", () => {
  const secret = `whsec_${Buffer.from("resend-webhook-secret").toString("base64")}`;
  const id = "msg_123";
  const body = JSON.stringify({ type: "email.delivered", data: { email_id: "abc" } });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const sign = (ts: string) =>
    "v1," +
    crypto
      .createHmac("sha256", Buffer.from(secret.replace(/^whsec_/, ""), "base64"))
      .update(`${id}.${ts}.${body}`)
      .digest("base64");

  it("accepts a fresh, correctly signed payload", () => {
    expect(verifySvixSignature({ id, timestamp, signature: sign(timestamp) }, body, secret)).toBe(true);
  });
  it("accepts one valid signature among rotated keys", () => {
    expect(verifySvixSignature({ id, timestamp, signature: `v1,AAAA ${sign(timestamp)}` }, body, secret)).toBe(true);
  });
  it("rejects a tampered payload and a stale timestamp", () => {
    expect(verifySvixSignature({ id, timestamp, signature: sign(timestamp) }, `${body} `, secret)).toBe(false);
    const old = String(Math.floor(Date.now() / 1000) - 600);
    expect(verifySvixSignature({ id, timestamp: old, signature: sign(old) }, body, secret)).toBe(false);
  });
  it("rejects missing headers", () => {
    expect(verifySvixSignature({ id: null, timestamp, signature: sign(timestamp) }, body, secret)).toBe(false);
  });
});
