import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role client for server-only code paths that act on behalf of
 * anonymous visitors (public booking, AI chat). It bypasses RLS, so every
 * query MUST filter by salon_id explicitly. Never import from a client
 * component — the "server-only" import guarantees a build error if you try.
 */
export function createAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are required for public booking and AI chat");
  }
  cached = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
