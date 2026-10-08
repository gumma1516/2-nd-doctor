import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Fail loudly instead of silently connecting to nothing (this caused the earlier "offline" errors).
  throw new Error(
    "Firebase config missing. Set NEXT_PUBLIC_FIREBASE_* variables in .env.local and restart the dev server."
  );
}

// Initialize Firebase only if it hasn't been initialized already
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
// Export Firestore database instance
export const db = getFirestore(app);
export const storage = getStorage(app);

// Explicit demo projects only: never redirect a real project's requests to emulators.
if (isNewApp && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") {
  if (!firebaseConfig.projectId.startsWith("demo-") ||
      (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname))) {
    throw new Error("Firebase emulators require a demo-* project and a localhost origin.");
  }
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
