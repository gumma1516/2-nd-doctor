import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:9199";

const app = initializeApp({ projectId: "demo-secondcare" });
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  const email = "doctor@example.com";
  const password = "password123";
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password, emailVerified: true });
  }

  const uid = user.uid;
  const now = FieldValue.serverTimestamp();

  await db.doc(`users/${uid}`).set({
    uid,
    email,
    role: "doctor",
    fullName: "Dr. Example Seed",
    phone: "9876543210",
    status: "active",
    isVerified: true,
    settings: { emailNotifications: true, language: "en" },
    createdAt: now,
    updatedAt: now,
    lastLogin: now,
    doctorAccess: { status: "VERIFIED", specialization: "Cardiology" }
  });

  await db.doc(`doctorProfiles/${uid}`).set({
    uid,
    email,
    fullName: "Dr. Example Seed",
    phone: "9876543210",
    regNumber: "MCI-12345",
    council: "Medical Council",
    specialization: "Cardiology",
    experience: 10,
    files: [{
      name: "certificate.pdf",
      path: `users/${uid}/credentials/certificate.pdf`,
      size: 1024,
      contentType: "application/pdf"
    }],
    status: "VERIFIED",
    createdAt: now,
    updatedAt: now,
    reviewedAt: now,
  });

  console.log("Verified doctor created:");
  console.log("Email:", email);
  console.log("Password:", password);
}

seed().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
