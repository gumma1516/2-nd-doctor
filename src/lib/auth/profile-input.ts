import { INDIAN_PHONE_REGEX } from "@/lib/constants";

export type EditableProfile = { fullName: string; phone: string; dob: string | null; place: string | null };

/** Reject impossible calendar dates as well as future dates. */
export function validBirthDate(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    && value >= "1900-01-01" && value <= now.toISOString().slice(0, 10);
}

export function normalizeProfile(input: EditableProfile, requirePatientDetails = false): EditableProfile {
  const fullName = input.fullName.trim();
  const phone = input.phone.replace(/[\s-]/g, "");
  const dob = input.dob?.trim() || null;
  const place = input.place?.trim() || null;
  if (fullName.length < 3 || fullName.length > 120) throw new Error("Enter a full name between 3 and 120 characters.");
  if (!INDIAN_PHONE_REGEX.test(phone)) throw new Error("Enter a valid 10-digit Indian mobile number.");
  if (requirePatientDetails && !dob) throw new Error("Enter your date of birth.");
  if (dob && !validBirthDate(dob)) throw new Error("Enter a valid date of birth between 1900 and today.");
  if ((requirePatientDetails && !place) || (place !== null && (place.length < 2 || place.length > 120))) {
    throw new Error("Enter a city/place between 2 and 120 characters.");
  }
  return { fullName, phone, dob, place };
}
