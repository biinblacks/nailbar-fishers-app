import { Router } from "express";
import { postChatMessage } from "../controllers/chat.controller.js";

export const chatRouter = Router();

chatRouter.post("/", postChatMessage);
