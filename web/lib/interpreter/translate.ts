import "server-only";
import { getAiProvider } from "@/lib/ai";
import { languageByCode } from "./languages";

/**
 * Nail-salon glossary so terminology stays consistent between Vietnamese
 * technicians and English-speaking guests. Kept short: it rides on every request.
 */
const GLOSSARY = `
Gel X / gel extensions = Gel X (nối móng gel)
dip powder = nhúng bột
acrylic full set = đắp bột (acrylic) bộ mới
fill / fill-in = fill (đắp lại phần mọc ra)
soak off / removal = tháo móng / ngâm tháo
manicure = làm móng tay
pedicure = làm móng chân
cuticle = da chết quanh móng
callus = da chai (chân)
buff / buffing = giũa bóng
nail art / design = vẽ móng / thiết kế
French tip = kiểu Pháp (đầu trắng)
ombré = ombré (chuyển màu)
chrome = chrome (bóng gương)
cat eye = mắt mèo
matte / glossy = nhám / bóng
shape: square / round / oval / almond / coffin (ballerina) / stiletto = dáng: vuông / tròn / oval / hạnh nhân / coffin / nhọn
length: short / medium / long = độ dài: ngắn / vừa / dài
lamp / cure = máy sấy (UV/LED) / hơ đèn
top coat / base coat = lớp phủ bóng / lớp lót
polish = sơn (thường)
gel polish = sơn gel
tip (gratuity) = tiền tip
deposit = tiền cọc
walk-in = khách không đặt trước
appointment = lịch hẹn
`.trim();

function roleFor(speaker: "a" | "b" | undefined): string {
  if (speaker === "a") return "The speaker is the nail technician talking to a guest.";
  if (speaker === "b") return "The speaker is the guest (customer) talking to the nail technician.";
  return "The conversation is between a nail technician and a guest.";
}

export interface TranslateInput {
  text: string;
  from: string;
  to: string;
  speaker?: "a" | "b";
  salonName?: string;
}

export async function translateText(input: TranslateInput): Promise<string> {
  const from = languageByCode(input.from);
  const to = languageByCode(input.to);

  const system = `You are a professional interpreter working the front desk of ${input.salonName ?? "a nail salon"}.
Translate the user's message from ${from.name} to ${to.name}.
${roleFor(input.speaker)}

Rules:
- Output ONLY the translation. No quotes, no explanations, no alternatives.
- Keep it natural and spoken, as a real interpreter would say it aloud. Preserve meaning, tone and politeness.
- Keep numbers, prices, times and proper names exactly as given.
- Vietnamese: use polite, friendly salon register (address the guest as "chị" by default, "anh" if clearly male; the technician as "em" when the guest speaks). Avoid overly formal or literary phrasing.
- Use the salon glossary for nail terms:
${GLOSSARY}
- If the message is already in ${to.name}, return it unchanged.`;

  const result = await getAiProvider().run({
    system,
    history: [],
    message: input.text,
    tools: [],
    execute: async () => ({}),
    maxToolRounds: 0,
  });
  return result.reply.trim().replace(/^["“”']+|["“”']+$/g, "");
}
