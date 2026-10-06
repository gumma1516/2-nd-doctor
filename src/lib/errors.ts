import { FirebaseError } from "firebase/app";

/** Centralized mapping of Firebase/unknown errors to user-friendly messages. */
const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "That email address looks invalid.",
  "auth/invalid-action-code": "This sign-in link is invalid, expired, or already used. Request a new one.",
  "auth/expired-action-code": "This sign-in link has expired. Request a new one.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/quota-exceeded": "Email quota exceeded for today. Please try again later.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed":
    "Email link sign-in is not enabled. Enable it in Firebase Console → Authentication → Sign-in method.",
  "auth/unauthorized-continue-uri": "This domain is not authorized in Firebase Console → Authentication → Settings.",
  "permission-denied": "You don't have permission to access this data.",
  unavailable: "Service temporarily unavailable. Please try again.",
  "storage/unauthorized": "You don't have permission to access this file.",
  "storage/quota-exceeded": "Storage quota exceeded.",
  "storage/canceled": "Upload cancelled.",
};

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof FirebaseError) {
    if (process.env.NODE_ENV !== "production") console.error(`[firebase] ${err.code}`, err);
    return MESSAGES[err.code] ?? fallback;
  }
  if (process.env.NODE_ENV !== "production") console.error(err);
  return err instanceof Error && err.message ? err.message : fallback;
}
