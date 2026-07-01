import { Router } from "express";
import { getBooking, postBooking } from "../controllers/booking.controller.js";

export const bookingRouter = Router();

bookingRouter.post("/", postBooking);
bookingRouter.get("/:id", getBooking);
