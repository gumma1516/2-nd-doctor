import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  runTransaction,
  updateDoc,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { normalizeProfile } from "@/lib/auth/profile-input";
import { DEFAULT_SETTINGS, type SelfServiceRole, type UserProfile, type UserSettings } from "./types";

const userRef = (uid: string) => doc(db, "users", uid);

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(userRef(uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  return onSnapshot(
    userRef(uid),
    (snap) => onData(snap.exists() ? (snap.data() as UserProfile) : null),
    onError
  );
}

export type NewUserInput = {
  role: SelfServiceRole;
  fullName: string;
  phone: string;
  dob?: string | null;
  place?: string | null;
};

/** Creates the profile for the signed-in user. UID and email come from the auth token, never from form input. */
export function newUserProfileData(user: User, input: NewUserInput, doctorAccess: UserProfile["doctorAccess"] = null) {
  if (!user.email) throw new Error("Signed-in account has no email.");
  if (!user.emailVerified) throw new Error("Verify your email before creating an account.");
  const normalized = normalizeProfile({ ...input, dob: input.dob ?? null, place: input.place ?? null }, input.role === "patient");
  return {
    uid: user.uid,
    email: user.email,
    role: input.role,
    doctorAccess,
    ...normalized,
    photoURL: null,
    photoPath: null,
    status: "active",
    isVerified: user.emailVerified,
    settings: DEFAULT_SETTINGS,
    sessionsRevokedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };
}

/** Existing profiles are never replaced, even when two onboarding tabs submit together. */
export async function createUserProfile(user: User, input: NewUserInput) {
  if (input.role !== "patient") throw new Error("Submit a doctor application to create a doctor account.");
  const data = newUserProfileData(user, input);
  await runTransaction(db, async (transaction) => {
    const [existing, application] = await Promise.all([
      transaction.get(userRef(user.uid)),
      transaction.get(doc(db, "doctorProfiles", user.uid)),
    ]);
    if (existing.exists()) throw new Error("Your account already exists. Reload to continue.");
    if (application.exists()) throw new Error("You already have a doctor application. Continue with doctor onboarding.");
    transaction.set(userRef(user.uid), data);
  });
  await logAudit(user.uid, "account_created", { role: input.role });
}

export type ProfilePatch = Partial<Pick<UserProfile, "fullName" | "phone" | "dob" | "place" | "photoURL" | "photoPath">> & {
  settings?: UserSettings;
};

export async function updateUserProfile(uid: string, patch: ProfilePatch) {
  if (auth.currentUser?.uid !== uid) throw new Error("You can only edit your own profile.");
  await updateDoc(userRef(uid), { ...patch, updatedAt: serverTimestamp() });
  await logAudit(uid, "profile_updated");
}

export async function touchLastLogin(uid: string) {
  await updateDoc(userRef(uid), { lastLogin: serverTimestamp() });
}

/** Invalidates every session (all devices) that signed in before now. */
export async function revokeAllSessions(uid: string) {
  await updateDoc(userRef(uid), { sessionsRevokedAt: serverTimestamp() });
}

export type AuditEvent =
  | "login"
  | "logout"
  | "logout_all_devices"
  | "account_created"
  | "profile_updated"
  | "photo_updated"
  | "settings_updated"
  | "doctor_application_submitted"
  | "case_created"
  | "case_completed";

/** Append-only audit trail at users/{uid}/audit. Failures never block the user action. */
export async function logAudit(uid: string, event: AuditEvent, meta: Record<string, string | number | boolean> = {}) {
  try {
    await addDoc(collection(db, "users", uid, "audit"), { event, meta, at: serverTimestamp() });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.warn("[audit] failed", event, err);
  }
}

export type AuditEntry = { id: string; event: AuditEvent; meta: Record<string, unknown>; at: Timestamp | null };

export async function listMyAudit(uid: string, max = 10): Promise<AuditEntry[]> {
  const snap = await getDocs(query(collection(db, "users", uid, "audit"), orderBy("at", "desc"), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditEntry, "id">) }));
}

/* ---------- Admin only (rules reject non-admins) ---------- */
export async function adminListUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => d.data() as UserProfile);
}

/** The rules independently enforce the caller's admin role and protect admin accounts. */
export async function adminSetUserStatus(uid: string, status: UserProfile["status"]) {
  if (!auth.currentUser || auth.currentUser.uid === uid) throw new Error("You cannot change your own account status here.");
  if (status !== "active" && status !== "disabled") throw new Error("Select a valid account status.");
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(userRef(uid));
    if (!snapshot.exists()) throw new Error("Account not found.");
    const profile = snapshot.data() as UserProfile;
    if (profile.role !== "patient" && profile.role !== "doctor") throw new Error("Admin accounts cannot be changed here.");
    transaction.update(userRef(uid), { status, updatedAt: serverTimestamp() });
  });
}
