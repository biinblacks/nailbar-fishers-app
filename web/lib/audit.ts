import "server-only";
import { createClient } from "@/lib/supabase/server";

interface AuditEntry {
  salonId: string;
  userId: string;
  action: string;
  entity?: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

/** Best-effort audit trail; never throws so it cannot break the user's action. */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("audit_log").insert({
      salon_id: entry.salonId,
      user_id: entry.userId,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      meta: (entry.meta ?? {}) as never,
    });
  } catch (err) {
    console.warn("[audit] failed to write entry", err);
  }
}
