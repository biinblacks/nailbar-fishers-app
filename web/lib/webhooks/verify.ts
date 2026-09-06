import "server-only";
import crypto from "node:crypto";

/**
 * Twilio request validation.
 * Twilio signs `url + sorted(param name + value)` with the account auth token
 * (HMAC-SHA1, base64). See https://www.twilio.com/docs/usage/security
 */
export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string | null, authToken: string): boolean {
  if (!signature) return false;
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Svix signature verification (used by Resend webhooks).
 * Signed content is `${id}.${timestamp}.${body}`, HMAC-SHA256 with the secret
 * after the `whsec_` prefix (base64-decoded). The header may carry several
 * space-separated `v1,<sig>` values during key rotation.
 */
export function verifySvixSignature(
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  secret: string
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) return false;

  // Reject anything older than 5 minutes to blunt replay attacks.
  const sent = Number(timestamp) * 1000;
  if (!Number.isFinite(sent) || Math.abs(Date.now() - sent) > 5 * 60_000) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  const expectedBuf = Buffer.from(expected);

  return signature.split(" ").some((part) => {
    const value = part.startsWith("v1,") ? part.slice(3) : part;
    const given = Buffer.from(value);
    return given.length === expectedBuf.length && crypto.timingSafeEqual(given, expectedBuf);
  });
}

/** Absolute URL Twilio signed, honouring the proxy headers Vercel sets. */
export function publicUrlFor(request: Request): string {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) url.host = forwardedHost;
  if (forwardedProto) url.protocol = `${forwardedProto}:`;
  return url.toString();
}
