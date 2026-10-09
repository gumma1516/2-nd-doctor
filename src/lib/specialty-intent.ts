"use client";

import { SPECIALTIES, type Specialty } from "@/lib/constants";

/**
 * A specialty picked on a public page has to survive sign-in before the
 * consultation form can preselect it. It is kept in sessionStorage for this tab
 * only, and losing it (restricted storage, or a sign-in link opened on another
 * device) simply means the form starts with nothing selected.
 */
const KEY = "sc:intent:specialty";

export const parseSpecialty = (value: unknown): Specialty | null =>
  typeof value === "string" && (SPECIALTIES as readonly string[]).includes(value) ? (value as Specialty) : null;

export const specialtyFromSearch = (search: string): Specialty | null => {
  try { return parseSpecialty(new URLSearchParams(search).get("specialty")); } catch { return null; }
};

export function rememberSpecialty(value: Specialty | null) {
  if (!value) return;
  try { sessionStorage.setItem(KEY, value); } catch { /* storage may be unavailable */ }
}

/** Reads the remembered specialty and forgets it, so a later consultation starts clean. */
export function takeSpecialty(): Specialty | null {
  try {
    const stored = parseSpecialty(sessionStorage.getItem(KEY));
    if (stored) sessionStorage.removeItem(KEY);
    return stored;
  } catch { return null; }
}
