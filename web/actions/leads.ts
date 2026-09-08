"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { toE164 } from "@/lib/messaging/providers";
import { fromZodError, optionalStr, str, type ActionState } from "@/lib/action-state";

/** Same shape as ActionState, plus the flag the form uses to swap in the thank-you panel. */
export interface LeadState extends ActionState {
  done?: boolean;
}

const schema = z.object({
  full_name: z.string().min(2, "Vui lòng nhập tên").max(120),
  phone: z.string().min(7, "Vui lòng nhập số điện thoại").max(30),
  salon_name: z.string().max(120).nullable(),
  city: z.string().max(120).nullable(),
  // Honeypot: a real person never fills a field they cannot see.
  website: z.string().max(0, "…").optional(),
});

/** UTM and click ids the ad platform appends, so spend can be judged per campaign. */
function trackingFrom(formData: FormData) {
  const pick = (k: string) => {
    const v = optionalStr(formData, k);
    return v ? v.slice(0, 300) : null;
  };
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_content: pick("utm_content"),
    fbclid: pick("fbclid"),
  };
}

export async function submitLeadAction(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const parsed = schema.safeParse({
    full_name: str(formData, "full_name"),
    phone: str(formData, "phone"),
    salon_name: optionalStr(formData, "salon_name"),
    city: optionalStr(formData, "city"),
    website: formData.get("website")?.toString() ?? "",
  });
  if (!parsed.success) return fromZodError(parsed.error);

  // A bot that filled the honeypot gets the success screen and no row: telling
  // it that it was caught only teaches whoever wrote it.
  if (parsed.data.website) return { done: true };

  const h = await headers();
  const ip = clientIp(h);
  const limit = await rateLimit(`lead:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Anh/chị đã gửi nhiều lần. Vui lòng thử lại sau hoặc gọi trực tiếp cho chúng tôi." };
  }

  const phone = toE164(parsed.data.phone);
  if (!phone) return { fieldErrors: { phone: "Số điện thoại chưa đúng. Ví dụ: (317) 555-0182" } };

  const db = createAdminClient();

  // De-duplicate within 24h so a double-tap or a re-submit is one lead. The
  // window lives here rather than in a unique index because Postgres will not
  // index a timestamptz cast to date.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await db
    .from("leads")
    .select("id")
    .eq("phone", phone)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  const row = {
    full_name: parsed.data.full_name.trim(),
    phone,
    salon_name: parsed.data.salon_name?.trim() || null,
    city: parsed.data.city?.trim() || null,
    source: "vsl",
    ...trackingFrom(formData),
    referer: h.get("referer")?.slice(0, 500) ?? null,
    user_agent: h.get("user-agent")?.slice(0, 300) ?? null,
  };

  // A repeat submit updates the existing lead rather than creating a duplicate
  // the sales follow-up would have to reconcile by hand.
  const { error } = recent
    ? await db.from("leads").update(row).eq("id", recent.id)
    : await db.from("leads").insert(row);

  if (error) {
    console.error("[lead] insert failed", error.message);
    return { error: "Không gửi được. Anh/chị thử lại giúp, hoặc gọi trực tiếp cho chúng tôi." };
  }

  return { done: true, success: "Đã nhận thông tin." };
}
