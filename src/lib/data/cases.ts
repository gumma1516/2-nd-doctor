import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PATIENT_UPLOAD, PRICING, SPECIALTIES, type Specialty } from "@/lib/constants";
import type { Case } from "./types";
import { deleteUserFiles, uploadUserFiles } from "./files";
import { logAudit } from "./users";

const casesCol = collection(db, "cases");
const byNewest = (a: Case, b: Case) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0);
const withId = (d: { id: string; data: () => unknown }) => ({ ...(d.data() as Omit<Case, "id">), id: d.id });

export async function listMyCases(uid: string): Promise<Case[]> {
  const snap = await getDocs(query(casesCol, where("ownerId", "==", uid)));
  return snap.docs.map(withId).sort(byNewest);
}

export async function getMyCase(uid: string, id: string): Promise<Case | null> {
  if (!/^[\w-]{1,128}$/.test(id)) throw new Error("Invalid consultation ID.");
  const snap = await getDoc(doc(casesCol, id));
  if (!snap.exists()) return null;
  const result = withId(snap);
  if (result.ownerId !== uid) throw new Error("This consultation belongs to another account.");
  return result;
}

export type NewCaseInput = {
  id: string;
  department: Specialty;
  chiefComplaint: string;
  medications: string;
  consentAt: string;
  files: File[];
};

/** A stable draft ID makes checkout retries reuse the same unpaid consultation. */
export async function createCase(uid: string, input: NewCaseInput): Promise<string> {
  if (!/^[\w-]{1,128}$/.test(input.id) || !SPECIALTIES.includes(input.department) ||
      input.chiefComplaint.trim().length < 20 || input.chiefComplaint.length > 2000 ||
      input.medications.length > 1000 || !Number.isFinite(Date.parse(input.consentAt))) {
    throw new Error("Please complete your consultation details before checkout.");
  }
  if (!input.files.length || input.files.length > PATIENT_UPLOAD.maxFiles ||
      input.files.some((file) => !file.size || file.size > PATIENT_UPLOAD.maxFileSizeMB * 1024 ** 2) ||
      input.files.reduce((total, file) => total + file.size, 0) > PATIENT_UPLOAD.maxTotalSizeMB * 1024 ** 2) {
    throw new Error("Your report attachments are missing or exceed the upload limits.");
  }
  const reference = doc(casesCol, input.id);
  const existing = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(reference);
    if (snap.exists()) {
      const data = snap.data() as Omit<Case, "id">;
      if (data.ownerId !== uid) throw new Error("This consultation belongs to another account.");
      if (data.status !== "AWAITING_PAYMENT") return data;
      if (data.department !== input.department || data.chiefComplaint !== input.chiefComplaint || data.medications !== input.medications) {
        throw new Error("This consultation has already been submitted. Resume payment from your dashboard or start a new consultation.");
      }
      return data;
    }
    transaction.set(reference, {
      ownerId: uid, department: input.department, chiefComplaint: input.chiefComplaint,
      medications: input.medications, consentAt: input.consentAt, files: [], amount: PRICING.total,
      status: "AWAITING_PAYMENT", paymentStatus: "PENDING", paymentOrderId: null, paymentId: null,
      doctorId: null, doctorName: null, assignedAt: null, opinion: null, paidAt: null,
      createdAt: serverTimestamp(), completedAt: null,
    });
    return null;
  });
  if (existing?.files.length) {
    if (existing.files.length !== input.files.length || existing.files.some((file, index) => {
      const original = input.files[index];
      return file.name !== original.name || file.size !== original.size || (original.type && file.contentType !== original.type);
    })) {
      throw new Error("These reports differ from the saved consultation. Resume the saved payment from your dashboard or start a new consultation.");
    }
    return input.id;
  }
  if (existing?.paymentStatus === "PAID") return input.id;

  // The record exists before uploads so Storage can authorize the owner's case folder.
  const uploaded = await uploadUserFiles(uid, `cases/${input.id}`, input.files);
  let attached = false;
  try {
    attached = await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(reference);
      const data = snap.data() as Case | undefined;
      if (!data || data.ownerId !== uid || data.status !== "AWAITING_PAYMENT" || data.paymentOrderId) {
        throw new Error("The consultation changed while reports were uploading. Reload checkout.");
      }
      if (data.files.length) return false;
      transaction.update(reference, { files: uploaded });
      return true;
    });
  } catch (error) {
    await deleteUserFiles(uploaded).catch(() => undefined);
    throw error;
  }
  if (!attached) await deleteUserFiles(uploaded).catch(() => undefined);
  await logAudit(uid, "case_created", { caseId: input.id }).catch(() => undefined);
  return input.id;
}

export async function listAssignedCases(doctorUid: string, specialization: Specialty): Promise<Case[]> {
  const snap = await getDocs(query(casesCol, where("doctorId", "==", doctorUid), where("department", "==", specialization), where("status", "==", "IN_REVIEW"), where("paymentStatus", "==", "PAID")));
  return snap.docs.map(withId).sort(byNewest);
}

export async function completeCase(doctorUid: string, caseId: string, opinion: string) {
  const trimmed = opinion.trim();
  if (trimmed.length < 20 || trimmed.length > 20000) throw new Error("Your opinion must contain 20 to 20,000 characters.");
  const reference = doc(casesCol, caseId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(reference);
    const data = snap.data() as Case | undefined;
    if (!data || data.status !== "IN_REVIEW" || data.paymentStatus !== "PAID" || data.doctorId !== doctorUid) {
      throw new Error("This case is no longer available for review. Refresh your dashboard.");
    }
    transaction.update(reference, { status: "COMPLETED", opinion: trimmed, completedAt: serverTimestamp() });
  });
  await logAudit(doctorUid, "case_completed", { caseId }).catch(() => undefined);
}

export async function adminListCases(): Promise<Case[]> {
  const snap = await getDocs(casesCol);
  return snap.docs.map(withId).sort(byNewest);
}

export const displayCaseId = (id: string) => `SC-${id.slice(0, 8).toUpperCase()}`;
