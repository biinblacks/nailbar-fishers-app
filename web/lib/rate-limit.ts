/**
 * Rate limiting with two backends:
 *  - Upstash Redis (REST) when UPSTASH_REDIS_REST_URL/TOKEN are set — shared
 *    across serverless instances, so limits are exact in production.
 *  - In-memory fallback otherwise (fine for local dev and single instances).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

async function upstash(commands: Array<Array<string | number>>): Promise<Array<{ result: unknown }>> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  return (await res.json()) as Array<{ result: unknown }>;
}

function memoryLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, retryAfterSeconds: 0 };
  }
  bucket.count += 1;
  if (bucket.count > max) return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  return { ok: true, retryAfterSeconds: 0 };
}

export async function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const redisKey = `rl:${key}`;
      const [incr] = await upstash([["INCR", redisKey]]);
      const count = Number(incr.result);
      if (count === 1) await upstash([["PEXPIRE", redisKey, windowMs]]);
      if (count > max) {
        const [ttl] = await upstash([["PTTL", redisKey]]);
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(Number(ttl.result) / 1000)) };
      }
      return { ok: true, retryAfterSeconds: 0 };
    } catch (err) {
      console.warn("[rate-limit] Upstash unavailable, using memory", err);
    }
  }
  return memoryLimit(key, max, windowMs);
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
