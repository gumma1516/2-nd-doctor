import type { SelfServiceRole } from "@/lib/data/types";

export type AuthIntent = { role: SelfServiceRole; remember: boolean };

/** Only self-service roles may be carried by an untrusted sign-in link. */
export function parseAuthIntent(value: unknown): AuthIntent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.role !== "patient" && candidate.role !== "doctor") return null;
  return { role: candidate.role, remember: candidate.remember === true };
}

export function intentFromUrl(url: string): AuthIntent | null {
  try {
    const params = new URL(url).searchParams;
    return parseAuthIntent({ role: params.get("role"), remember: params.get("remember") === "1" });
  } catch {
    return null;
  }
}

export function authContinuationUrl(origin: string, intent: AuthIntent): string {
  const safeIntent = parseAuthIntent(intent);
  if (!safeIntent) throw new Error("Choose a patient or doctor account.");
  const url = new URL("/auth/finish", origin);
  url.searchParams.set("role", safeIntent.role);
  url.searchParams.set("remember", safeIntent.remember ? "1" : "0");
  return url.toString();
}
