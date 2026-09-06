import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Salon, SalonRole } from "@/lib/types";

/**
 * Route-handler flavour of requireSalonAccess: returns null instead of
 * redirecting so the handler can answer 401/404 itself.
 */
export async function getSalonAccessForApi(slug: string): Promise<{ salon: Salon; role: SalonRole; userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: salon } = await supabase.from("salons").select("*").eq("slug", slug).maybeSingle();
  if (!salon) return null;
  const { data: membership } = await supabase
    .from("salon_members")
    .select("role")
    .eq("salon_id", salon.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return null;
  return { salon: salon as Salon, role: membership.role, userId: user.id };
}
