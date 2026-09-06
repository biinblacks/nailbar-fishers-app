import type { NextFunction, Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import { ApiError } from "./error.middleware.js";
import type { Salon } from "../types/index.js";

declare module "express-serve-static-core" {
  interface Request {
    salon: Salon;
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { salon: Salon; expiresAt: number }>();

async function loadSalon(slug: string): Promise<Salon | null> {
  const cached = cache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.salon;

  const { data, error } = await supabase
    .from("salons")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new ApiError(500, error.message);
  if (!data) return null;

  const salon = data as Salon;
  cache.set(slug, { salon, expiresAt: Date.now() + CACHE_TTL_MS });
  return salon;
}

export function invalidateSalonCache(slug: string): void {
  cache.delete(slug);
}

// Resolves the tenant for every request. Priority:
//   1. `x-salon-slug` header   (set by the Vite client via VITE_SALON_SLUG)
//   2. `?salon=<slug>` query   (handy for iframe embeds)
//   3. DEFAULT_SALON_SLUG env  (legacy single-salon deployments)
export async function resolveSalon(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const headerSlug = req.headers["x-salon-slug"];
  const querySlug = typeof req.query.salon === "string" ? req.query.salon : undefined;
  const slug = (
    (typeof headerSlug === "string" ? headerSlug : undefined) ??
    querySlug ??
    env.defaultSalonSlug
  )
    .trim()
    .toLowerCase();

  if (!SLUG_PATTERN.test(slug)) {
    next(new ApiError(400, "Invalid salon identifier"));
    return;
  }

  try {
    const salon = await loadSalon(slug);
    if (!salon) {
      next(new ApiError(404, `Salon "${slug}" not found`));
      return;
    }
    req.salon = salon;
    next();
  } catch (err) {
    next(err);
  }
}
