import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { DOCTOR_UPLOAD, SPECIALTIES, type Specialty } from "@/lib/constants";
import type { DoctorProfile, DoctorStatus, UserProfile } from "./types";
import { deleteUserFile, uploadUserFiles } from "./files";
import { logAudit, newUserProfileData } from "./users";

const doctorRef = (uid: string) => doc(db, "doctorProfiles", uid);
const userRef = (uid: string) => doc(db, "users", uid);

export async function getMyDoctorProfile(uid: string): Promise<DoctorProfile | null> {
  const snap = await getDoc(doctorRef(uid));
  return snap.exists() ? (snap.data() as DoctorProfile) : null;
}

export type DoctorApplication = {
  fullName: string;
  phone: string;
  regNumber: string;
  council: string;
  specialization: Specialty;
  experience: number;
  files: File[];
};

/** Recover applications saved by the former two-write signup without changing their review status. */
export async function recoverDoctorApplication(user: User): Promise<DoctorProfile | null> {
  return runTransaction(db, async (transaction) => {
    const [application, profile] = await Promise.all([
      transaction.get(doctorRef(user.uid)), transaction.get(userRef(user.uid)),
    ]);
    if (profile.exists() && profile.data().role !== "doctor") throw new Error("This account already has a different role.");
    if (!application.exists()) return null;
    const doctor = application.data() as DoctorProfile;
    if (!profile.exists()) {
      transaction.set(userRef(user.uid), newUserProfileData(user, {
        role: "doctor", fullName: doctor.fullName, phone: doctor.phone,
      }, { status: doctor.status, specialization: doctor.specialization }));
    }
    return doctor;
  });
}

export async function submitDoctorApplication(user: User, app: DoctorApplication) {
  if (!user.email) throw new Error("Signed-in account has no email.");
  if (!SPECIALTIES.includes(app.specialization)) throw new Error("Select a valid specialization.");
  if (!app.files.length || app.files.length > DOCTOR_UPLOAD.maxFiles) throw new Error("Upload one to five credential documents.");
  if (await recoverDoctorApplication(user)) return;
  const files = await uploadUserFiles(user.uid, "credentials", app.files);
  try {
    await runTransaction(db, async (transaction) => {
      const [existing, profile] = await Promise.all([
        transaction.get(doctorRef(user.uid)), transaction.get(userRef(user.uid)),
      ]);
      if (existing.exists()) throw new Error("Your application is already submitted. Reload to view its status.");
      if (profile.exists() && profile.data().role !== "doctor") throw new Error("This account already has a different role.");
      const doctorAccess = { status: "PENDING" as const, specialization: app.specialization };
      transaction.set(doctorRef(user.uid), {
        uid: user.uid, email: user.email, fullName: app.fullName.trim(), phone: app.phone,
        regNumber: app.regNumber.trim(), council: app.council.trim(), specialization: app.specialization,
        experience: app.experience, files, status: "PENDING", createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(), reviewedAt: null,
      });
      if (profile.exists()) {
        transaction.update(userRef(user.uid), { doctorAccess, updatedAt: serverTimestamp() });
      } else {
        transaction.set(userRef(user.uid), newUserProfileData(user, {
          role: "doctor", fullName: app.fullName, phone: app.phone,
        }, doctorAccess));
      }
    });
  } catch (error) {
    await Promise.allSettled(files.map((file) => deleteUserFile(file.path)));
    throw error;
  }
  await logAudit(user.uid, "doctor_application_submitted", { specialization: app.specialization });
}

/* Admin-only operations are enforced by Firestore rules. */
export async function adminListDoctors(): Promise<DoctorProfile[]> {
  const snap = await getDocs(collection(db, "doctorProfiles"));
  return snap.docs.map((d) => d.data() as DoctorProfile)
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
}

export async function adminSetDoctorStatus(uid: string, status: DoctorStatus) {
  await runTransaction(db, async (transaction) => {
    const [application, profile] = await Promise.all([
      transaction.get(doctorRef(uid)), transaction.get(userRef(uid)),
    ]);
    if (!application.exists()) throw new Error("Doctor application not found.");
    if (!profile.exists()) throw new Error("This doctor must finish account recovery before review. Ask them to sign in again.");
    if ((profile.data() as UserProfile).role !== "doctor") throw new Error("This account is not a doctor.");
    const doctor = application.data() as DoctorProfile;
    transaction.update(doctorRef(uid), { status, reviewedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    transaction.update(userRef(uid), { doctorAccess: { status, specialization: doctor.specialization }, updatedAt: serverTimestamp() });
  });
}
