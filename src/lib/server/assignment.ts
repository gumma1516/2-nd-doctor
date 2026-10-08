import "server-only";
import { FieldPath, FieldValue, type DocumentData, type Query } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { validId } from "./http";
import { SPECIALTIES, type Specialty } from "../constants";

export type AssignmentResult = {
  caseId: string;
  status: "assigned" | "waiting" | "already-assigned" | "ineligible";
  doctorId: string | null;
};

/** Run only after verified payment. Assignment and rotation advance in the same transaction. */
export async function assignCase(caseId: string): Promise<AssignmentResult> {
  validId(caseId, "consultation ID");
  const database = adminDb();
  const reference = database.doc(`cases/${caseId}`);
  return database.runTransaction(async (transaction) => {
    const consultation = (await transaction.get(reference)).data();
    if (!consultation || consultation.status !== "IN_REVIEW" || consultation.paymentStatus !== "PAID" ||
        !consultation.paymentId || !consultation.paidAt || !SPECIALTIES.includes(consultation.department)) {
      return { caseId, status: "ineligible", doctorId: null };
    }
    const previousDoctorId = typeof consultation.doctorId === "string" ? consultation.doctorId : null;
    const waitForDoctor = (): AssignmentResult => {
      if (previousDoctorId) {
        transaction.update(reference, { doctorId: null, doctorName: null, assignedAt: null });
        transaction.set(database.collection("assignmentAudit").doc(), {
          caseId, previousDoctorId, doctorId: null, action: "unassigned", at: FieldValue.serverTimestamp(),
        });
      }
      return { caseId, status: "waiting", doctorId: null };
    };
    const doctors = await transaction.get(database.collection("doctorProfiles")
      .where("status", "==", "VERIFIED").where("specialization", "==", consultation.department));
    if (doctors.empty) return waitForDoctor();
    // These reads participate in the transaction, including approval and account status.
    // A simultaneous suspension, approval or assignment forces a retry before committing.
    const profiles = await transaction.getAll(...doctors.docs.map((doctor) => database.doc(`users/${doctor.id}`)));
    const users = new Map(profiles.map((profile) => [profile.id, profile.data()]));
    const candidates = doctors.docs.filter((doctor) => {
      const account = users.get(doctor.id);
      const profile = doctor.data();
      return account?.role === "doctor" && account.status === "active" && account.isVerified === true &&
        account.doctorAccess?.status === "VERIFIED" && account.doctorAccess.specialization === consultation.department &&
        profile.uid === doctor.id && typeof profile.fullName === "string" && profile.fullName.trim().length > 0;
    }).sort((a, b) => {
      const left = a.data().lastAssignedAt;
      const right = b.data().lastAssignedAt;
      return ((left?.seconds ?? 0) - (right?.seconds ?? 0)) ||
        ((left?.nanoseconds ?? 0) - (right?.nanoseconds ?? 0)) || a.id.localeCompare(b.id);
    });
    if (candidates.some((doctor) => doctor.id === previousDoctorId)) {
      return { caseId, status: "already-assigned", doctorId: previousDoctorId };
    }
    const selected = candidates[0];
    if (!selected) return waitForDoctor();

    transaction.update(reference, {
      doctorId: selected.id, doctorName: selected.data().fullName,
      assignedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(selected.ref, { lastAssignedAt: FieldValue.serverTimestamp() });
    transaction.set(database.collection("assignmentAudit").doc(), {
      caseId, doctorId: selected.id, previousDoctorId, action: "assigned", department: consultation.department, at: FieldValue.serverTimestamp(),
    });
    return { caseId, status: "assigned", doctorId: selected.id };
  });
}

/** Bounded, cursor-based sweeps let administrators recover a backlog after adding specialists. */
export async function assignPendingCases(options: { specialization?: Specialty; afterCaseId?: string; limit: number }) {
  let pending: Query<DocumentData> = adminDb().collection("cases")
    .where("status", "==", "IN_REVIEW").where("paymentStatus", "==", "PAID");
  if (options.specialization) pending = pending.where("department", "==", options.specialization);
  pending = pending.orderBy(FieldPath.documentId());
  if (options.afterCaseId) pending = pending.startAfter(options.afterCaseId);
  const queue = await pending.limit(options.limit + 1).get();
  const page = queue.docs.slice(0, options.limit);
  let assigned = 0;
  let waiting = 0;
  let skipped = 0;
  // Sequential transactions preserve rotation and avoid self-induced contention.
  for (const consultation of page) {
    const result = await assignCase(consultation.id);
    if (result.status === "assigned") assigned += 1;
    else if (result.status === "waiting") waiting += 1;
    else skipped += 1;
  }
  return {
    processed: page.length, assigned, waiting, skipped,
    nextCursor: queue.size > options.limit ? page.at(-1)?.id ?? null : null,
  };
}
