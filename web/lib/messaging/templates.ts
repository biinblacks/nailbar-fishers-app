import { formatTime } from "@/lib/format";

export interface TemplateContext {
  customer_name: string;
  salon_name: string;
  salon_phone: string;
  service: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  technician: string;
  review_link: string;
  booking_link: string;
}

export const PLACEHOLDERS: Array<{ key: keyof TemplateContext | "technician_with"; description: string }> = [
  { key: "customer_name", description: "Guest's first name" },
  { key: "salon_name", description: "Salon name" },
  { key: "salon_phone", description: "Salon phone" },
  { key: "service", description: "Service booked" },
  { key: "date", description: "Appointment date" },
  { key: "time", description: "Appointment time" },
  { key: "technician", description: "Technician name" },
  { key: "technician_with", description: "\" with <technician>\" or empty" },
  { key: "review_link", description: "Google review page" },
  { key: "booking_link", description: "Online booking page" },
];

function formatDateFor(date: string, lang: string): string {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return lang === "vi"
    ? dt.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })
    : dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeFor(time: string, lang: string): string {
  if (!time) return "";
  return lang === "vi" ? time.slice(0, 5) : formatTime(time);
}

/** Renders {{placeholders}}; unknown keys are removed rather than leaked. */
export function renderTemplate(template: string, ctx: Partial<TemplateContext>, lang: "en" | "vi"): string {
  const firstName = (ctx.customer_name ?? "").trim().split(/\s+/)[0] ?? "";
  const technician = ctx.technician ?? "";
  const values: Record<string, string> = {
    customer_name: firstName || (lang === "vi" ? "bạn" : "there"),
    salon_name: ctx.salon_name ?? "",
    salon_phone: ctx.salon_phone ?? "",
    service: ctx.service ?? (lang === "vi" ? "dịch vụ" : "your appointment"),
    date: formatDateFor(ctx.date ?? "", lang),
    time: formatTimeFor(ctx.time ?? "", lang),
    technician,
    technician_with: technician ? (lang === "vi" ? ` với ${technician}` : ` with ${technician}`) : "",
    review_link: ctx.review_link ?? "",
    booking_link: ctx.booking_link ?? "",
  };
  return template
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => values[key] ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
