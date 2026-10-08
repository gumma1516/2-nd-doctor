import { adminDb } from "./firebase-admin";

export type AuditAction = 
  | "DOCTOR_OATH_ACCEPTED"
  | "AI_SUMMARY_GENERATED"
  | "AI_TRIAGE_GENERATED"
  | "CASE_VIEWED"
  | "CASE_COMPLETED";

export async function logAudit(
  actorUid: string,
  action: AuditAction,
  resourceId: string,
  metadata?: Record<string, unknown>
) {
  try {
    await adminDb().collection("audit_logs").add({
      actorUid,
      action,
      resourceId,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // We swallow the error so audit logging failures don't break the main flow,
    // but we log it to standard error for operational visibility.
    console.error("Failed to write audit log:", error);
  }
}
