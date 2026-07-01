import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  if (status >= 500) {
    logger.error(message, err);
  }
  res.status(status).json({ error: message });
}

export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<void>>(
  fn: T
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
