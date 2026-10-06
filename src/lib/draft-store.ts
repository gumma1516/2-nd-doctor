"use client";

import type { Specialty } from "@/lib/constants";

export type ConsultationDraft = {
  id: string;
  department: Specialty;
  chiefComplaint: string;
  medications: string;
  fileNames: string[];
  consentAt: string;
};

export type SavedDraft = { draft: ConsultationDraft; files: File[] };
type StoredDraft = {
  uid: string;
  draft: ConsultationDraft;
  files: { blob: Blob; name: string; type: string; lastModified: number }[];
};

const DB_NAME = "secondcare-private-drafts";
const STORE = "drafts";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser cannot save reports. Enable browser storage before continuing."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "uid" });
    request.onerror = () => reject(new Error("Unable to open local draft storage. Check browser storage permissions."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = operation(transaction.objectStore(STORE));
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onabort = transaction.onerror = () => {
      database.close();
      reject(new Error("Draft could not be saved or restored. Free browser storage and try again."));
    };
  });
}

function requireOwner(uid: string) {
  if (!uid) throw new Error("Sign in before saving a consultation.");
}

/** Blobs and text commit together; records are isolated by the authenticated UID. */
export const draftStore = {
  async save(uid: string, draft: ConsultationDraft, files: File[]): Promise<void> {
    requireOwner(uid);
    if (draft.fileNames.length !== files.length || files.some((file, i) => file.name !== draft.fileNames[i])) {
      throw new Error("Your report attachments changed. Please select them again.");
    }
    const record: StoredDraft = {
      uid, draft,
      files: files.map((file) => ({ blob: file, name: file.name, type: file.type, lastModified: file.lastModified })),
    };
    await transact("readwrite", (store) => store.put(record));
  },
  async get(uid: string): Promise<SavedDraft | null> {
    requireOwner(uid);
    const record = await transact<StoredDraft | undefined>("readonly", (store) => store.get(uid));
    if (!record) return null;
    return {
      draft: record.draft,
      files: record.files.map(({ blob, name, type, lastModified }) => new File([blob], name, { type, lastModified })),
    };
  },
  async clear(uid: string): Promise<void> {
    requireOwner(uid);
    await transact("readwrite", (store) => store.delete(uid));
  },
  async clearAll(): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    await transact("readwrite", (store) => store.clear());
  },
};
