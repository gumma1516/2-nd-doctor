"use client";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  setPersistence,
  signInWithEmailLink,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { Role } from "@/lib/data/types";
import { draftStore } from "@/lib/draft-store";
import { authContinuationUrl, intentFromUrl, parseAuthIntent, type AuthIntent } from "./intent";
export type { AuthIntent } from "./intent";

/**
 * Passwordless email-link sign-in (Firebase Auth).
 * Firebase issues a one-time link, verifies it server-side, and returns a
 * short-lived ID token (1h) plus a refresh token that the SDK rotates automatically.
 */

const EMAIL_KEY = "sc:auth:email";
const INTENT_KEY = "sc:auth:intent";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const RESEND_SECONDS = 60;

export async function sendLoginLink(email: string, intent: AuthIntent) {
  await sendSignInLinkToEmail(auth, email, {
    url: authContinuationUrl(window.location.origin, intent),
    handleCodeInApp: true,
  });
  // Stored on this device only, so the link can't be used on another device without re-typing the email.
  try {
    localStorage.setItem(EMAIL_KEY, email);
    localStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  } catch {
    // The link carries the role; restricted browser storage only requires email confirmation.
  }
}

export const isLoginLink = (url: string) => isSignInWithEmailLink(auth, url);

export function getPendingEmail() {
  try { return localStorage.getItem(EMAIL_KEY); } catch { return null; }
}

export function getPendingIntent(url?: string): AuthIntent | null {
  // A link opened on a different device must not inherit a stale local role.
  if (url) return intentFromUrl(url);
  try {
    return parseAuthIntent(JSON.parse(localStorage.getItem(INTENT_KEY) ?? "null"));
  } catch {
    /* ignore malformed value */
  }
  return null;
}

export async function completeLoginLink(email: string, url: string, remember: boolean) {
  // "Remember me" → survive browser restarts; otherwise the session ends when the tab closes.
  await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  const cred = await signInWithEmailLink(auth, email, url);
  try {
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(INTENT_KEY);
  } catch { /* Sign-in also works when browser storage is restricted. */ }
  return cred.user;
}

export const homeFor = (role: Role) =>
  role === "admin" ? "/admin/dashboard" : role === "doctor" ? "/doctor/dashboard" : "/patient/dashboard";

/** Remove anything a previous user may have left in this browser. */
export async function clearUserScopedStorage() {
  for (const name of ["sessionStorage", "localStorage"] as const) {
    try {
      const store = window[name];
      for (const key of Object.keys(store)) {
        if (key.startsWith("sc:") && !key.startsWith("sc:auth:")) store.removeItem(key);
      }
    } catch { /* Storage may be disabled by the browser. */ }
  }
  await draftStore.clearAll();
}
