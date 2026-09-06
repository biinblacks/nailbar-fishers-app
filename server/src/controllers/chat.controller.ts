import type { Request, Response } from "express";
import { z } from "zod";
import { generateChatReply } from "../services/ai.service.js";
import { asyncHandler } from "../middleware/error.middleware.js";

const chatSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export const postChatMessage = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId, message } = chatSchema.parse(req.body);
  const reply = await generateChatReply(req.salon, sessionId, message);
  res.json(reply);
});
