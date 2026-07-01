import type { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const getSalonProfile = asyncHandler(async (_req: Request, res: Response) => {
  const { data } = await supabase.from("salon_profile").select("*").limit(1).maybeSingle();
  res.json(data);
});

export const getBusinessHours = asyncHandler(async (_req: Request, res: Response) => {
  const { data } = await supabase.from("business_hours").select("*").order("day_of_week");
  res.json(data ?? []);
});

export const getServices = asyncHandler(async (_req: Request, res: Response) => {
  const { data } = await supabase
    .from("services")
    .select("*, service_categories(name)")
    .eq("is_active", true)
    .order("display_order");
  res.json(data ?? []);
});

export const getStaff = asyncHandler(async (_req: Request, res: Response) => {
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  res.json(data ?? []);
});

export const getFaqs = asyncHandler(async (_req: Request, res: Response) => {
  const { data } = await supabase
    .from("faqs")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  res.json(data ?? []);
});

export const getPromotions = asyncHandler(async (_req: Request, res: Response) => {
  const { data } = await supabase.from("promotions").select("*").eq("is_active", true);
  res.json(data ?? []);
});
