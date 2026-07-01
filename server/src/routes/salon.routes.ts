import { Router } from "express";
import {
  getBusinessHours,
  getFaqs,
  getPromotions,
  getSalonProfile,
  getServices,
  getStaff,
} from "../controllers/salon.controller.js";

export const salonRouter = Router();

salonRouter.get("/profile", getSalonProfile);
salonRouter.get("/hours", getBusinessHours);
salonRouter.get("/services", getServices);
salonRouter.get("/staff", getStaff);
salonRouter.get("/faqs", getFaqs);
salonRouter.get("/promotions", getPromotions);
