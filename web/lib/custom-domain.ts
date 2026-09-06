import type { NextRequest } from "next/server";

const cache = new Map<string, { slug: string | null; expiresAt: number }>();
const TTL_MS = 5 * 60_000;

function primaryHosts(): Set<string> {
  const hosts = new Set(["localhost", "127.0.0.1"]);
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) hosts.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname);
  } catch {
    /* ignore */
  }
  if (process.env.VERCEL_URL) hosts.add(process.env.VERCEL_URL);
  return hosts;
}

async function lookupSlug(host: string): Promise<string | null> {
  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.slug;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let slug: string | null = null;
  if (url && key) {
    try {
      // Anonymous read: salons are publicly readable when active.
      const res = await fetch(`${url}/rest/v1/salons?select=slug&is_active=eq.true&custom_domain=ilike.${encodeURIComponent(host)}&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      const rows = (await res.json().catch(() => [])) as Array<{ slug: string }>;
      slug = rows[0]?.slug ?? null;
    } catch {
      slug = null;
    }
  }
  cache.set(host, { slug, expiresAt: Date.now() + TTL_MS });
  return slug;
}

/**
 * If the request arrives on a salon's custom domain, returns the internal URL
 * to rewrite to (e.g. nails.example.com/book → /s/nail-bar/book). Otherwise null.
 */
export async function resolveCustomDomain(request: NextRequest): Promise<URL | null> {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!host || primaryHosts().has(host) || host.endsWith(".vercel.app")) return null;
  const path = request.nextUrl.pathname;
  if (path.startsWith("/app") || path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/invite")) return null;

  const slug = await lookupSlug(host);
  if (!slug) return null;
  const url = request.nextUrl.clone();
  url.pathname = path === "/" ? `/s/${slug}` : `/s/${slug}${path}`;
  return url;
}
