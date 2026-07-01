import { Router } from "express";
import { requireAdmin } from "../middleware/auth.middleware.js";
import {
  createKnowledge,
  createService,
  createStaff,
  deleteKnowledge,
  deleteService,
  deleteStaff,
  getConversationMessages,
  listAppointmentsAdmin,
  listConversationsAdmin,
  listHoursAdmin,
  listKnowledgeAdmin,
  listServicesAdmin,
  listStaffAdmin,
  updateAppointmentStatus,
  updateKnowledge,
  updateSalonProfile,
  updateService,
  updateStaff,
  upsertHours,
} from "../controllers/admin.controller.js";

export const adminRouter = Router();

// All admin routes require a valid Supabase Auth session.
adminRouter.use(requireAdmin);

adminRouter.get("/services", listServicesAdmin);
adminRouter.post("/services", createService);
adminRouter.put("/services/:id", updateService);
adminRouter.delete("/services/:id", deleteService);

adminRouter.get("/hours", listHoursAdmin);
adminRouter.put("/hours", upsertHours);

adminRouter.get("/staff", listStaffAdmin);
adminRouter.post("/staff", createStaff);
adminRouter.put("/staff/:id", updateStaff);
adminRouter.delete("/staff/:id", deleteStaff);

adminRouter.get("/appointments", listAppointmentsAdmin);
adminRouter.put("/appointments/:id/status", updateAppointmentStatus);

adminRouter.get("/knowledge", listKnowledgeAdmin);
adminRouter.post("/knowledge", createKnowledge);
adminRouter.put("/knowledge/:id", updateKnowledge);
adminRouter.delete("/knowledge/:id", deleteKnowledge);

adminRouter.put("/profile", updateSalonProfile);

adminRouter.get("/conversations", listConversationsAdmin);
adminRouter.get("/conversations/:id/messages", getConversationMessages);
