// Run with: npx tsx --env-file=.env.local scripts/check-firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocsFromServer, terminate } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function main() {
  console.log("projectId:", config.projectId ?? "(MISSING)");
  const db = getFirestore(initializeApp(config));
  const timeout = (ms: number) => new Promise((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms}ms`)), ms));
  try {
    const ref = (await Promise.race([
      addDoc(collection(db, "_connection_test"), { at: new Date().toISOString() }),
      timeout(15000),
    ])) as { id: string };
    console.log("WRITE OK, doc id:", ref.id);
    const snap = await getDocsFromServer(collection(db, "_connection_test"));
    console.log("READ FROM SERVER OK, docs:", snap.size);
  } catch (err) {
    console.error("FAILED:", (err as Error).message ?? err);
  } finally {
    await terminate(db);
    process.exit(0);
  }
}

main();
