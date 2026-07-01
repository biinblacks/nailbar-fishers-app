import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env.js";

const genAI = new GoogleGenerativeAI(env.geminiApiKey);

export const geminiModel = genAI.getGenerativeModel({
  model: env.geminiModel,
  generationConfig: {
    temperature: 0.6,
    maxOutputTokens: 512,
  },
});
