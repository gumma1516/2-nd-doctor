import type { Timestamp } from "firebase/firestore";
import type { Specialty } from "@/lib/constants";

/**
 * Data model. Every document is owned by a Firebase Auth UID (unique, random,
 * never derived from email/phone). Ownership is enforced server-side by
 * firestore.rules / storage.rules — the client code here only mirrors it.
 *
 *   users/{uid}                 one profile per account (patient | doctor | admin)
 *   users/{uid}/audit/{id}      append-only audit trail for that user
 *   doctorProfiles/{uid}        doctor credentials + verification status
 *   cases/{caseId}              consultation, ownerId = patient uid
 *
 * Storage:
 *   users/{uid}/avatar/*        profile photo
 *   users/{uid}/credentials/*   doctor certificates (owner + admin)
 *   users/{uid}/cases/{caseId}/* medical reports (owner, assigned doctor, admin)
 */

export type Role = "patient" | "doctor" | "admin";
export type SelfServiceRole = Exclude<Role, "admin">;

export type UserSettings = {
  emailNotifications: boolean;
  language: "en" | "hi";
};

export type UserProfile = {
  uid: string;
  email: string;
  role: Role;
  doctorAccess?: { status: DoctorStatus; specialization: Specialty } | null;
  fullName: string;
  phone: string;
  dob: string | null;
  place: string | null;
  photoURL: string | null;
  photoPath: string | null;
  status: "active" | "disabled";
  isVerified: boolean;
  settings: UserSettings;
  /** Set by "log out of all devices". Sessions that signed in before this are rejected by the rules. */
  sessionsRevokedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastLogin: Timestamp | null;
};

export type StoredFile = {
  name: string;
  path: string;
  size: number;
  contentType: string;
};

export type DoctorStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type DoctorProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  regNumber: string;
  council: string;
  specialization: Specialty;
  experience: number;
  files: StoredFile[];
  status: DoctorStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  reviewedAt: Timestamp | null;
  lastAssignedAt?: Timestamp | null;
};

export type CaseStatus = "AWAITING_PAYMENT" | "IN_REVIEW" | "COMPLETED";

export type Case = {
  id: string;
  ownerId: string;
  department: Specialty;
  chiefComplaint: string;
  medications: string;
  files: StoredFile[];
  consentAt: string;
  amount: number;
  paymentStatus: "PENDING" | "PAID";
  paymentOrderId: string | null;
  paymentId: string | null;
  status: CaseStatus;
  doctorId: string | null;
  doctorName: string | null;
  assignedAt: Timestamp | null;
  opinion: string | null;
  paidAt: Timestamp | null;
  createdAt: Timestamp | null;
  completedAt: Timestamp | null;
};

export const DEFAULT_SETTINGS: UserSettings = { emailNotifications: true, language: "en" };

export const toDate = (t: Timestamp | null | undefined) => (t ? t.toDate() : null);

/**
 * Firestore rules bound the keys of a `files` entry but cannot require every
 * one of them, so treat the display metadata as optional and fall back to the
 * storage path, which the rules do guarantee.
 */
export function fileLabel(file: StoredFile): string {
  const name = typeof file.name === "string" ? file.name.trim() : "";
  return name || file.path.split("/").pop() || "Attached file";
}

export function fileSizeLabel(file: StoredFile): string | null {
  if (!Number.isFinite(file.size) || file.size <= 0) return null;
  const kb = 1024;
  return file.size < kb ** 2 ? `${Math.round(file.size / kb)} KB` : `${(file.size / kb ** 2).toFixed(1)} MB`;
}
