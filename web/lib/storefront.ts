import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BusinessHour, Salon, Service, ServiceCategory, Staff } from "@/lib/types";

export interface Faq {
  id: string;
  question: string;
  answer: string;
}
export interface Promotion {
  id: string;
  title: string;
  description: string;
  ends_at: string | null;
}
export interface Policy {
  id: string;
  title: string;
  content: string;
}
export interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
}

export type PublicSalon = Salon & {
  online_booking_enabled: boolean;
  booking_slot_minutes: number;
  booking_lead_minutes: number;
  booking_window_days: number;
  booking_buffer_minutes: number;
  ai_enabled: boolean;
  ai_greeting: string | null;
  ai_can_book: boolean;
  sms_number: string | null;
  sms_ai_autoreply: boolean;
};

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Public, active salon by slug. Returns null for unknown or deactivated salons. */
export const getPublicSalon = cache(async (slug: string): Promise<PublicSalon | null> => {
  if (!SLUG_RE.test(slug)) return null;
  const { data } = await createAdminClient()
    .from("salons")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as PublicSalon | null) ?? null;
});

export interface StorefrontData {
  categories: ServiceCategory[];
  services: Service[];
  staff: Staff[];
  hours: BusinessHour[];
  faqs: Faq[];
  promotions: Promotion[];
  policies: Policy[];
  gallery: GalleryImage[];
}

/** Everything the storefront, booking page and AI prompt need, in one round-trip. */
export const getStorefrontData = cache(async (salonId: string): Promise<StorefrontData> => {
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [categories, services, staff, hours, faqs, promotions, policies, gallery] = await Promise.all([
    db.from("service_categories").select("*").eq("salon_id", salonId).order("display_order"),
    db
      .from("services")
      .select("*, service_categories(name)")
      .eq("salon_id", salonId)
      .eq("is_active", true)
      .order("display_order")
      .order("name"),
    db.from("staff").select("*").eq("salon_id", salonId).eq("is_active", true).order("display_order"),
    db.from("business_hours").select("*").eq("salon_id", salonId).order("day_of_week"),
    db.from("faqs").select("id, question, answer").eq("salon_id", salonId).eq("is_active", true).order("display_order"),
    db
      .from("promotions")
      .select("id, title, description, ends_at")
      .eq("salon_id", salonId)
      .eq("is_active", true)
      .or(`ends_at.is.null,ends_at.gte.${today}`),
    db.from("salon_policies").select("id, title, content").eq("salon_id", salonId).order("display_order"),
    db.from("salon_gallery").select("id, image_url, caption").eq("salon_id", salonId).order("display_order").limit(24),
  ]);
  return {
    categories: (categories.data ?? []) as ServiceCategory[],
    services: (services.data ?? []) as Service[],
    staff: (staff.data ?? []) as Staff[],
    hours: (hours.data ?? []) as BusinessHour[],
    faqs: (faqs.data ?? []) as Faq[],
    promotions: (promotions.data ?? []) as Promotion[],
    policies: (policies.data ?? []) as Policy[],
    gallery: (gallery.data ?? []) as GalleryImage[],
  };
});
