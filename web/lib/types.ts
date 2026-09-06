// Row types for the tables the Phase 1 dashboard touches. Column names match
// supabase/schema.sql + supabase/migrations/0001_multi_tenant_salons.sql.

export type SalonRole = "owner" | "admin" | "staff";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];

export type AppointmentSource = "online" | "ai" | "phone" | "walk_in" | "manual";

export interface Salon {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  parking_info: string | null;
  google_review_link: string | null;
  google_map_link: string | null;
  instagram_link: string | null;
  facebook_link: string | null;
  logo_url: string | null;
  plan: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalonMembership {
  salon_id: string;
  user_id: string;
  role: SalonRole;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface BusinessHour {
  id: string;
  salon_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface ServiceCategory {
  id: string;
  salon_id: string;
  name: string;
  display_order: number;
}

export interface Service {
  id: string;
  salon_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  price_label: string | null;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  created_at: string;
  service_categories?: { name: string } | null;
}

export interface Staff {
  id: string;
  salon_id: string;
  user_id: string | null;
  full_name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  color: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Customer {
  id: string;
  salon_id: string;
  full_name: string;
  phone: string;
  email: string | null;
  preferred_language: string | null;
  notes: string | null;
  birthday: string | null;
  tags: string[];
  last_visit_at: string | null;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  salon_id: string;
  customer_id: string | null;
  service_id: string | null;
  staff_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  appointment_date: string; // YYYY-MM-DD
  appointment_time: string; // HH:mm[:ss]
  duration_minutes: number | null;
  notes: string | null;
  status: AppointmentStatus;
  source: AppointmentSource | string;
  review_requested: boolean;
  created_at: string;
  updated_at: string;
  services?: { name: string; price_cents: number; price_label: string | null; duration_minutes: number } | null;
  staff?: { full_name: string; color: string | null } | null;
}
