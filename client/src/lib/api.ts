import { supabase } from "./supabaseClient";
import type {
  AiKnowledge,
  Appointment,
  BusinessHour,
  ChatConversation,
  ChatMessage,
  Faq,
  Promotion,
  SalonProfile,
  Service,
  Staff,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeader();
  return request<T>(path, { ...options, headers: { ...headers, ...options.headers } });
}

// ---------------------------------------------------------------------------
// Public salon data
// ---------------------------------------------------------------------------
export const salonApi = {
  getProfile: () => request<SalonProfile>("/salon/profile"),
  getHours: () => request<BusinessHour[]>("/salon/hours"),
  getServices: () => request<Service[]>("/salon/services"),
  getStaff: () => request<Staff[]>("/salon/staff"),
  getFaqs: () => request<Faq[]>("/salon/faqs"),
  getPromotions: () => request<Promotion[]>("/salon/promotions"),
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
export const chatApi = {
  sendMessage: (sessionId: string, message: string) =>
    request<{ sessionId: string; reply: string; needsHuman: boolean }>("/chat", {
      method: "POST",
      body: JSON.stringify({ sessionId, message }),
    }),
};

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------
export interface CreateBookingPayload {
  serviceId: string;
  staffId?: string | null;
  date: string;
  time: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}

export const bookingApi = {
  create: (payload: CreateBookingPayload) =>
    request<Appointment>("/bookings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getById: (id: string) => request<Appointment>(`/bookings/${id}`),
};

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminApi = {
  listServices: () => adminRequest<Service[]>("/admin/services"),
  createService: (payload: Partial<Service>) =>
    adminRequest<Service>("/admin/services", { method: "POST", body: JSON.stringify(payload) }),
  updateService: (id: string, payload: Partial<Service>) =>
    adminRequest<Service>(`/admin/services/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteService: (id: string) => adminRequest<void>(`/admin/services/${id}`, { method: "DELETE" }),

  listHours: () => adminRequest<BusinessHour[]>("/admin/hours"),
  upsertHours: (payload: Partial<BusinessHour>) =>
    adminRequest<BusinessHour>("/admin/hours", { method: "PUT", body: JSON.stringify(payload) }),

  listStaff: () => adminRequest<Staff[]>("/admin/staff"),
  createStaff: (payload: Partial<Staff>) =>
    adminRequest<Staff>("/admin/staff", { method: "POST", body: JSON.stringify(payload) }),
  updateStaff: (id: string, payload: Partial<Staff>) =>
    adminRequest<Staff>(`/admin/staff/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStaff: (id: string) => adminRequest<void>(`/admin/staff/${id}`, { method: "DELETE" }),

  listAppointments: () => adminRequest<Appointment[]>("/admin/appointments"),
  updateAppointmentStatus: (id: string, status: Appointment["status"]) =>
    adminRequest<Appointment>(`/admin/appointments/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  listKnowledge: () => adminRequest<AiKnowledge[]>("/admin/knowledge"),
  createKnowledge: (payload: Partial<AiKnowledge>) =>
    adminRequest<AiKnowledge>("/admin/knowledge", { method: "POST", body: JSON.stringify(payload) }),
  updateKnowledge: (id: string, payload: Partial<AiKnowledge>) =>
    adminRequest<AiKnowledge>(`/admin/knowledge/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteKnowledge: (id: string) => adminRequest<void>(`/admin/knowledge/${id}`, { method: "DELETE" }),

  updateProfile: (payload: Partial<SalonProfile>) =>
    adminRequest<SalonProfile>("/admin/profile", { method: "PUT", body: JSON.stringify(payload) }),

  listConversations: () => adminRequest<ChatConversation[]>("/admin/conversations"),
  getConversationMessages: (id: string) =>
    adminRequest<ChatMessage[]>(`/admin/conversations/${id}/messages`),
};
