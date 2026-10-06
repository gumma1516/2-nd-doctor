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
  if (!projectId || ((!clientEmail || !privateKey) && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.K_SERVICE)) {
    throw new HttpError(503, "Checkout is not configured. The administrator must configure Firebase Admin and Razorpay server credentials.");
  }
  return initializeApp({ projectId, credential: clientEmail && privateKey ? cert({ projectId, clientEmail, privateKey }) : applicationDefault() }, "secondcare-server");
}

export const adminDb = () => getFirestore(adminApp());

export function adminBucket() {
  const bucket = process.env.FIREBASE_ADMIN_STORAGE_BUCKET;
  if (!bucket) throw new HttpError(503, "Checkout is not configured. The administrator must configure the Firebase Storage bucket.");
  return getStorage(adminApp()).bucket(bucket);
}

export async function requirePatient(request: Request): Promise<string> {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Sign in to continue checkout.");
  const auth = getAuth(adminApp());
  let decoded;
  try { decoded = await auth.verifyIdToken(token, true); }
  catch { throw new HttpError(401, "Your session has expired. Sign in again."); }
  const profile = (await adminDb().doc(`users/${decoded.uid}`).get()).data();
  const revokedAt = profile?.sessionsRevokedAt?.toMillis?.() ?? 0;
  if (!decoded.email_verified || profile?.role !== "patient" || profile?.status !== "active" || revokedAt >= decoded.auth_time * 1000) {
    throw new HttpError(403, "An active verified patient account is required for checkout.");
  }
  return decoded.uid;
}
