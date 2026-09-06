import type { NextFunction, Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { ApiError } from "./error.middleware.js";

declare module "express-serve-static-core" {
  interface Request {
    adminUserId?: string;
    adminRole?: "owner" | "admin" | "staff";
  }
}

// Verifies the Supabase Auth bearer token sent by the dashboard AND that the
// user is a member of the salon resolved by the tenant middleware.
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new ApiError(401, "Missing authorization token"));
    return;
  }

  const token = header.slice("Bearer ".length);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    next(new ApiError(401, "Invalid or expired session"));
    return;
  }

  const { data: membership } = await supabase
    .from("salon_members")
    .select("role")
    .eq("salon_id", req.salon.id)
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!membership) {
    next(new ApiError(403, "You do not have access to this salon"));
    return;
  }

  req.adminUserId = data.user.id;
  req.adminRole = membership.role as "owner" | "admin" | "staff";
  next();
}
