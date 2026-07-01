export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

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
}

export interface ServiceCategory {
  id: string;
  name: string;
  display_order: number;
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

export interface Appointment {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  staff_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  appointment_date: string;
  appointment_time: string;
  notes: string | null;
  status: AppointmentStatus;
  review_requested: boolean;
  created_at: string;
}

export interface ChatMessagePayload {
  sessionId: string;
  message: string;
  language?: "en" | "vi";
}

export interface ChatReply {
  sessionId: string;
  reply: string;
  needsHuman: boolean;
}
