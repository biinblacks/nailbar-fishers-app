import type { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { asyncHandler } from "../middleware/error.middleware.js";

// Public storefront data. All queries are scoped to the salon resolved by
// the tenant middleware (req.salon).
export const getSalonProfile = asyncHandler(async (req: Request, res: Response) => {
  res.json(req.salon);
});

export const getBusinessHours = asyncHandler(async (req: Request, res: Response) => {
  const { data } = await supabase
    .from("business_hours")
    .select("*")
    .eq("salon_id", req.salon.id)
    .order("day_of_week");
  res.json(data ?? []);
});

export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const { data } = await supabase
    .from("services")
    .select("*, service_categories(name)")
    .eq("salon_id", req.salon.id)
    .eq("is_active", true)
    .order("display_order");
  res.json(data ?? []);
});

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
  const { data } = await supabase
    .from("staff")
    .select("*")
    .eq("salon_id", req.salon.id)
    .eq("is_active", true)
    .order("display_order");
  res.json(data ?? []);
});

export const getFaqs = asyncHandler(async (req: Request, res: Response) => {
  const { data } = await supabase
    .from("faqs")
    .select("*")
    .eq("salon_id", req.salon.id)
    .eq("is_active", true)
    .order("display_order");
  res.json(data ?? []);
});

export const getPromotions = asyncHandler(async (req: Request, res: Response) => {
  const { data } = await supabase
    .from("promotions")
    .select("*")
    .eq("salon_id", req.salon.id)
    .eq("is_active", true);
  res.json(data ?? []);
});
