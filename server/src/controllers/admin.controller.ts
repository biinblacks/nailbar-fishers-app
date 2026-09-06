import type { Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { ApiError } from "../middleware/error.middleware.js";
import { invalidateSalonCache } from "../middleware/tenant.middleware.js";

// Every handler below is scoped to req.salon (tenant middleware) and only
// reachable by salon members (requireAdmin middleware).

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------
const serviceSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price_cents: z.number().int().nonnegative(),
  price_label: z.string().nullable().optional(),
  duration_minutes: z.number().int().positive(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
  image_url: z.string().nullable().optional(),
});

export const listServicesAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("salon_id", req.salon.id)
    .order("display_order");
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const input = serviceSchema.parse(req.body);
  const { data, error } = await supabase
    .from("services")
    .insert({ ...input, salon_id: req.salon.id })
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.status(201).json(data);
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const input = serviceSchema.partial().parse(req.body);
  const { data, error } = await supabase
    .from("services")
    .update(input)
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id)
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id);
  if (error) throw new ApiError(500, error.message);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Business hours
// ---------------------------------------------------------------------------
const hoursSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  open_time: z.string().nullable(),
  close_time: z.string().nullable(),
  is_closed: z.boolean(),
});

export const listHoursAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("salon_id", req.salon.id)
    .order("day_of_week");
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const upsertHours = asyncHandler(async (req: Request, res: Response) => {
  const input = hoursSchema.parse(req.body);
  const { data, error } = await supabase
    .from("business_hours")
    .upsert({ ...input, salon_id: req.salon.id }, { onConflict: "salon_id,day_of_week" })
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------
const staffSchema = z.object({
  full_name: z.string().min(1),
  title: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  photo_url: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

export const listStaffAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("salon_id", req.salon.id)
    .order("display_order");
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const input = staffSchema.parse(req.body);
  const { data, error } = await supabase
    .from("staff")
    .insert({ ...input, salon_id: req.salon.id })
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.status(201).json(data);
});

export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const input = staffSchema.partial().parse(req.body);
  const { data, error } = await supabase
    .from("staff")
    .update(input)
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id)
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id);
  if (error) throw new ApiError(500, error.message);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
const appointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
});

export const listAppointmentsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("appointments")
    .select("*, services(name), staff(full_name)")
    .eq("salon_id", req.salon.id)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = appointmentStatusSchema.parse(req.body);
  const reviewRequested = status === "completed";
  const { data, error } = await supabase
    .from("appointments")
    .update({ status, review_requested: reviewRequested })
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id)
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

// ---------------------------------------------------------------------------
// AI knowledge
// ---------------------------------------------------------------------------
const knowledgeSchema = z.object({
  topic: z.string().min(1),
  content: z.string().min(1),
  is_active: z.boolean().optional(),
});

export const listKnowledgeAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("ai_knowledge")
    .select("*")
    .eq("salon_id", req.salon.id)
    .order("topic");
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const createKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const input = knowledgeSchema.parse(req.body);
  const { data, error } = await supabase
    .from("ai_knowledge")
    .insert({ ...input, salon_id: req.salon.id })
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.status(201).json(data);
});

export const updateKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const input = knowledgeSchema.partial().parse(req.body);
  const { data, error } = await supabase
    .from("ai_knowledge")
    .update(input)
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id)
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const deleteKnowledge = asyncHandler(async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("ai_knowledge")
    .delete()
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id);
  if (error) throw new ApiError(500, error.message);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Salon profile (now the `salons` row itself)
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  parking_info: z.string().nullable().optional(),
  google_review_link: z.string().nullable().optional(),
  google_map_link: z.string().nullable().optional(),
  instagram_link: z.string().nullable().optional(),
  facebook_link: z.string().nullable().optional(),
});

export const updateSalonProfile = asyncHandler(async (req: Request, res: Response) => {
  if (req.adminRole === "staff") {
    throw new ApiError(403, "Only owners and admins can edit the salon profile");
  }
  const input = profileSchema.partial().parse(req.body);
  const { data, error } = await supabase
    .from("salons")
    .update(input)
    .eq("id", req.salon.id)
    .select("*")
    .single();
  if (error) throw new ApiError(500, error.message);
  invalidateSalonCache(req.salon.slug);
  res.json(data);
});

// ---------------------------------------------------------------------------
// Chat conversations / customer messages
// ---------------------------------------------------------------------------
export const listConversationsAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("*")
    .eq("salon_id", req.salon.id)
    .order("updated_at", { ascending: false });
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});

export const getConversationMessages = asyncHandler(async (req: Request, res: Response) => {
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("id", req.params.id)
    .eq("salon_id", req.salon.id)
    .maybeSingle();
  if (!conversation) throw new ApiError(404, "Conversation not found");

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", req.params.id)
    .order("created_at");
  if (error) throw new ApiError(500, error.message);
  res.json(data);
});
