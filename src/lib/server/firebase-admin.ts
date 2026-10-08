import "server-only";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpError } from "./http";

function adminApp() {
  const existing = getApps().find((app) => app.name === "secondcare-server");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const emulated = projectId?.startsWith("demo-") && process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (!projectId || (!emulated && (!clientEmail || !privateKey) && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE)) {
    throw new HttpError(503, "The server is not configured. The administrator must configure Firebase Admin credentials.");
  }
  return initializeApp({ projectId, ...(emulated ? {} : { credential: clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault() }) }, "secondcare-server");
}

export const adminDb = () => getFirestore(adminApp());

export function adminBucket() {
  const bucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;
  if (!bucket) throw new HttpError(503, "Checkout is not configured. The administrator must configure the Firebase Storage bucket.");
  return getStorage(adminApp()).bucket(bucket);
}

async function requireRole(request: Request, role: "patient" | "doctor" | "admin"): Promise<string> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in to continue.");
  const auth = getAuth(adminApp());
  let decoded;
  try { decoded = await auth.verifyIdToken(token, true); }
  catch { throw new HttpError(401, "Your session has expired. Sign in again."); }
  const profile = (await adminDb().doc(`users/${decoded.uid}`).get()).data();
  const revokedAt = profile?.sessionsRevokedAt?.toMillis?.() ?? 0;
  if (!decoded.email_verified || profile?.role !== role || profile?.status !== "active" || revokedAt >= decoded.auth_time * 1000) {
    throw new HttpError(403, `An active verified ${role} account is required.`);
  }
  if (role === "doctor" && profile?.doctorAccess?.status !== "VERIFIED") {
    throw new HttpError(403, "A verified specialist account is required.");
  }
  return decoded.uid;
}

export const requirePatient = (request: Request) => requireRole(request, "patient");
export const requireAdmin = (request: Request) => requireRole(request, "admin");
export const requireDoctor = (request: Request) => requireRole(request, "doctor");
