import { deleteObject, getBlob, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import { DOCTOR_UPLOAD, PATIENT_UPLOAD } from "@/lib/constants";
import type { StoredFile } from "./types";

const MB = 1024 * 1024;
const safeName = (name: string) => name.replace(/[^\w.\-() ]+/g, "_").slice(-120);
const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/** Validate again at the data boundary; Storage rules independently enforce access and size/type. */
export async function uploadUserFiles(uid: string, folder: string, files: File[]): Promise<StoredFile[]> {
  if (auth.currentUser?.uid !== uid) throw new Error("Sign in to upload your files.");
  const isCase = /^cases\/[A-Za-z0-9_-]+$/.test(folder);
  if (!isCase && folder !== "credentials" && folder !== "avatar") throw new Error("Invalid upload folder.");
  const limits = isCase ? PATIENT_UPLOAD : DOCTOR_UPLOAD;
  if (files.length > (folder === "avatar" ? 1 : limits.maxFiles)) throw new Error("Too many files selected.");
  if (files.reduce((sum, file) => sum + file.size, 0) > limits.maxTotalSizeMB * MB) {
    throw new Error(`Files must total no more than ${limits.maxTotalSizeMB} MB.`);
  }
  const prepared = files.map((file) => {
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const allowed: readonly string[] = folder === "avatar" ? [".jpg", ".jpeg", ".png"] : limits.accept;
    const contentType = CONTENT_TYPES[extension];
    if (!allowed.includes(extension) || !contentType || (file.type && file.type !== contentType)) {
      throw new Error(`${file.name}: unsupported file type.`);
    }
    if (file.size === 0 || file.size > limits.maxFileSizeMB * MB) {
      throw new Error(`${file.name}: select a nonempty file up to ${limits.maxFileSizeMB} MB.`);
    }
    return { file, contentType };
  });
  const uploaded: StoredFile[] = [];
  try {
    for (const { file, contentType } of prepared) {
      const path = `users/${uid}/${folder}/${crypto.randomUUID()}-${safeName(file.name)}`;
      await uploadBytes(ref(storage, path), file, { contentType });
      uploaded.push({ name: file.name, path, size: file.size, contentType });
    }
    return uploaded;
  } catch (error) {
    await deleteUserFiles(uploaded);
    throw error;
  }
}

/** Fetch through the authenticated SDK so every medical-file read is checked by Storage rules. */
export async function getUserFileBlob(path: string): Promise<Blob> {
  if (!auth.currentUser) throw new Error("Sign in to open this file.");
  if (!/^users\/[^/]+\/(?:credentials\/|cases\/[^/]+\/|avatar\/)[^/]+$/.test(path)) {
    throw new Error("This file reference is invalid.");
  }
  return getBlob(ref(storage, path), PATIENT_UPLOAD.maxFileSizeMB * MB);
}

export async function deleteUserFile(path: string) {
  try {
    await deleteObject(ref(storage, path));
  } catch (error) {
    if ((error as { code?: string }).code !== "storage/object-not-found") throw error;
  }
}

export async function deleteUserFiles(files: StoredFile[]) {
  const results = await Promise.allSettled(files.map((file) => deleteUserFile(file.path)));
  if (results.some((result) => result.status === "rejected")) {
    throw new Error("Some uploaded files could not be removed. Please retry before submitting again.");
  }
}

/** Only public profile photos may use a token URL. Medical reports and credentials use getUserFileBlob. */
export async function uploadAvatar(uid: string, file: File): Promise<{ url: string; path: string }> {
  const [stored] = await uploadUserFiles(uid, "avatar", [file]);
  return { url: await getDownloadURL(ref(storage, stored.path)), path: stored.path };
}
