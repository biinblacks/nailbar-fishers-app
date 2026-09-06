import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Salon, SalonRole } from "@/lib/types";

export interface SalonContext {
  salon: Salon;
  role: SalonRole;
  userId: string;
}

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** All salons the signed-in user belongs to, with their role. */
export const listMySalons = cache(async (): Promise<Array<{ salon: Salon; role: SalonRole }>> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) return [];

  const { data } = await supabase
    .from("salon_members")
    .select("role, salons(*)")
    .eq("user_id", user.id)
    .order("created_at");

  return (data ?? [])
    .filter((row) => row.salons)
    .map((row) => ({
      role: row.role as SalonRole,
      salon: row.salons as unknown as Salon,
    }));
});

/**
 * Resolves the salon for a dashboard route and verifies the current user is
 * a member. Redirects to /login when signed out, 404s when the salon does
 * not exist or the user is not a member (so slugs cannot be enumerated).
 */
export const requireSalonAccess = cache(async (slug: string): Promise<SalonContext> => {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/app/${slug}`);

  const { data: salon } = await supabase.from("salons").select("*").eq("slug", slug).maybeSingle();
  if (!salon) notFound();

  const { data: membership } = await supabase
    .from("salon_members")
    .select("role")
    .eq("salon_id", salon.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  return { salon: salon as Salon, role: membership.role as SalonRole, userId: user.id };
});

export function canManageSalon(role: SalonRole): boolean {
  return role === "owner" || role === "admin";
}
