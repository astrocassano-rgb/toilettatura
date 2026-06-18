import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuditAction = 
  | "SESSION_STOP"
  | "MANUAL_TOPUP"
  | "STATION_MAINTENANCE"
  | "BOOKING_CANCEL"
  | "BOOKING_CONFIRM";

export async function logAdminAction(
  adminId: string,
  action: AuditAction,
  entityType: "session" | "wallet" | "station" | "booking",
  entityId: string,
  payload?: Record<string, any>
) {
  const supabase = await createSupabaseServerClient();
  
  const { error } = await (supabase as any)
    .from("admin_audit_logs")
    .insert({
      admin_id: adminId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      payload: payload || {},
    });

  if (error) {
    console.error("[Audit Log Error]", error.message);
    // Non blocchiamo l'esecuzione per un errore di log, ma lo loggiamo in console
  }
}
