import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Client-side Supabase instance uses the public anon key only.
// It is used for the admin login/session flow (Supabase Auth) and
// for reading RLS-protected public data if the API is unreachable.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
