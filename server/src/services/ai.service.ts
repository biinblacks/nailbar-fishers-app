import { geminiModel } from "../config/gemini.js";
import { supabase } from "../config/supabase.js";
import { buildKnowledgeBaseContext } from "./knowledge.service.js";
import type { ChatReply } from "../types/index.js";

const HUMAN_HANDOFF_TRIGGERS = [
  "speak to a person",
  "talk to a human",
  "real person",
  "manager",
  "complaint",
  "refund",
  "nói chuyện với người",
  "gặp quản lý",
];

function buildSystemPrompt(knowledgeContext: string): string {
  return `You are the AI receptionist for a luxury nail salon. You are warm, professional, concise, and helpful — like a great front-desk receptionist at a high-end spa.

RULES:
- Only answer using the salon information provided below. Never invent prices, hours, addresses, or policies.
- If asked something you don't have information for, say you're not sure and offer to have the front desk follow up.
- Keep replies short (1-4 sentences) and natural, not robotic.
- When a customer asks about pricing or services, mention the price and gently offer to help them book an appointment.
- When asked about hours, give today's specific hours if you can infer the day, otherwise the general schedule.
- Detect the customer's language automatically. If they write in Vietnamese, reply fluently in Vietnamese. Otherwise reply in English.
- If a customer seems upset, requests a refund, or explicitly asks for a human/manager, acknowledge you're connecting them with the front desk team.
- Never use more than one exclamation point in a reply. Avoid emojis except an occasional single star or checkmark when confirming a booking.

SALON KNOWLEDGE BASE:
${knowledgeContext}`;
}

function detectHandoff(message: string): boolean {
  const lower = message.toLowerCase();
  return HUMAN_HANDOFF_TRIGGERS.some((trigger) => lower.includes(trigger));
}

async function getOrCreateConversation(sessionId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("chat_conversations")
    .insert({ session_id: sessionId })
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create chat conversation: ${error?.message}`);
  }
  return created.id as string;
}

// Generates an AI reply for one turn of the conversation, persisting both
// the user message and the assistant reply, and maintaining short-term
// context memory by replaying prior turns to Gemini.
export async function generateChatReply(
  sessionId: string,
  message: string
): Promise<ChatReply> {
  const conversationId = await getOrCreateConversation(sessionId);

  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(20);

  const knowledgeContext = await buildKnowledgeBaseContext();
  const systemPrompt = buildSystemPrompt(knowledgeContext);

  const geminiHistory = (history ?? [])
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const chat = geminiModel.startChat({
    history: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Understood. I'll act as the salon's AI receptionist using only this information." }] },
      ...geminiHistory,
    ],
  });

  const result = await chat.sendMessage(message);
  const reply = result.response.text().trim();
  const needsHuman = detectHandoff(message);

  await supabase.from("chat_messages").insert([
    { conversation_id: conversationId, role: "user", content: message },
    { conversation_id: conversationId, role: "assistant", content: reply },
  ]);

  if (needsHuman) {
    await supabase
      .from("chat_conversations")
      .update({ needs_human: true })
      .eq("id", conversationId);
  }

  return { sessionId, reply, needsHuman };
}
