import type { NextFunction, Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { ApiError } from "./error.middleware.js";

declare module "express-serve-static-core" {
  interface Request {
    adminUserId?: string;
  }
}

// Verifies the Supabase Auth bearer token sent by the admin dashboard.
// Only authenticated admin users may reach the admin CRUD routes.
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

  req.adminUserId = data.user.id;
  next();
}
