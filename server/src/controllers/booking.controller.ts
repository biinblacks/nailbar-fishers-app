import type { Request, Response } from "express";
import { z } from "zod";
import { createBooking, getAppointmentById } from "../services/booking.service.js";
import { asyncHandler } from "../middleware/error.middleware.js";

const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "time must be HH:mm"),
  name: z.string().min(1).max(120),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional().nullable().or(z.literal("")),
  notes: z.string().max(500).optional().nullable(),
});

export const postBooking = asyncHandler(async (req: Request, res: Response) => {
  const input = bookingSchema.parse(req.body);
  const appointment = await createBooking(req.salon.id, {
    ...input,
    email: input.email || null,
  });
  res.status(201).json(appointment);
});

export const getBooking = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await getAppointmentById(req.salon.id, req.params.id);
  res.json(appointment);
});
