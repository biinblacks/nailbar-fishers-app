import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Server-side client uses the service role key so it can bypass RLS for
// trusted operations (admin writes, appointment creation, chat logging).
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
