export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface ServiceCategory {
  id: string;
  name: string;
  display_order: number;
}

export interface Service {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  price_label: string | null;
  duration_minutes: number;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  service_categories?: { name: string } | null;
}

export interface Staff {
  id: string;
  full_name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  display_order: number;
}

export interface BusinessHour {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

export interface SalonProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  parking_info: string | null;
  google_review_link: string | null;
  google_map_link: string | null;
  instagram_link: string | null;
  facebook_link: string | null;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  is_active: boolean;
  display_order: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  appointment_date: string;
  appointment_time: string;
  notes: string | null;
  status: AppointmentStatus;
  review_requested: boolean;
  created_at: string;
  services?: { name: string; price_cents: number; price_label: string | null } | null;
  staff?: { full_name: string } | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: string;
  session_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  needs_human: boolean;
  updated_at: string;
}

export interface AiKnowledge {
  id: string;
  topic: string;
  content: string;
  is_active: boolean;
}
