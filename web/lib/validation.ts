import { z } from "zod";

export const slugSchema = z
  .string()
  .min(3, "At least 3 characters")
  .max(48, "At most 48 characters")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes only");

export const uuidSchema = z.string().uuid("Invalid id");

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const timeSchema = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Use HH:MM");

export const phoneSchema = z
  .string()
  .min(7, "Phone number looks too short")
  .max(20, "Phone number looks too long");

export const salonProfileSchema = z.object({
  name: z.string().min(2, "Salon name is required").max(80),
  address: z.string().max(200).nullable(),
  phone: z.string().max(30).nullable(),
  email: z.string().email("Enter a valid email").nullable().or(z.literal(null)),
  timezone: z.string().min(1).max(64),
  parking_info: z.string().max(500).nullable(),
  google_review_link: z.string().url("Enter a full URL").nullable(),
  google_map_link: z.string().url("Enter a full URL").nullable(),
  instagram_link: z.string().url("Enter a full URL").nullable(),
  facebook_link: z.string().url("Enter a full URL").nullable(),
});

export const createSalonSchema = z.object({
  name: z.string().min(2, "Salon name is required").max(80),
  slug: slugSchema,
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  timezone: z.string().min(1).max(64),
});

export const serviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  description: z.string().max(1000).nullable(),
  price_cents: z.number().int().nonnegative("Price cannot be negative"),
  price_label: z.string().max(60).nullable(),
  duration_minutes: z.number().int().min(5, "Minimum 5 minutes").max(600),
  category_id: uuidSchema.nullable(),
  is_active: z.boolean(),
  display_order: z.number().int().min(0).max(9999),
});

export const staffSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(120),
  title: z.string().max(80).nullable(),
  bio: z.string().max(1000).nullable(),
  phone: z.string().max(30).nullable(),
  email: z.string().email("Enter a valid email").nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a color").nullable(),
  is_active: z.boolean(),
  display_order: z.number().int().min(0).max(9999),
});

export const customerSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(120),
  phone: phoneSchema,
  email: z.string().email("Enter a valid email").nullable(),
  preferred_language: z.enum(["en", "vi"]),
  birthday: dateSchema.nullable(),
  notes: z.string().max(2000).nullable(),
  tags: z.array(z.string().min(1).max(30)).max(20),
  marketing_opt_in: z.boolean(),
});

export const appointmentSchema = z.object({
  customer_id: uuidSchema.nullable(),
  customer_name: z.string().min(1, "Customer name is required").max(120),
  customer_phone: phoneSchema,
  customer_email: z.string().email("Enter a valid email").nullable(),
  service_id: uuidSchema,
  staff_id: uuidSchema.nullable(),
  appointment_date: dateSchema,
  appointment_time: timeSchema,
  duration_minutes: z.number().int().min(5).max(600).nullable(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
  source: z.enum(["online", "ai", "phone", "walk_in", "manual"]),
  notes: z.string().max(1000).nullable(),
});

export const businessHoursSchema = z.array(
  z.object({
    day_of_week: z.number().int().min(0).max(6),
    is_closed: z.boolean(),
    open_time: timeSchema.nullable(),
    close_time: timeSchema.nullable(),
  })
).length(7);

export const TIMEZONES = [
  "America/New_York",
  "America/Indiana/Indianapolis",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Ho_Chi_Minh",
  "Australia/Sydney",
  "Europe/London",
];
