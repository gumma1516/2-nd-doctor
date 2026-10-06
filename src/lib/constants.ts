/**
 * Single source of truth for domain constants shared across the app.
 * NOTE: Pricing shown here is for display only. Once a backend exists,
 * the amount charged MUST be calculated server-side.
 */

export const SPECIALTIES = [
  "Cardiology",
  "Neurology",
  "Oncology",
  "Orthopedics",
  "Nephrology",
  "Pulmonology",
  "Gastroenterology",
  "Urology",
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export const PRICING = {
  consultationFee: 1500,
  platformFee: 150,
  get total() {
    return this.consultationFee + this.platformFee;
  },
} as const;

export const formatINR = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

/** Upload limits for patient medical reports. */
export const PATIENT_UPLOAD = {
  maxFiles: 20,
  maxFileSizeMB: 50,
  maxTotalSizeMB: 500,
  accept: [".pdf", ".jpg", ".jpeg", ".png", ".docx"],
} as const;

/** Upload limits for doctor credential documents. */
export const DOCTOR_UPLOAD = {
  maxFiles: 5,
  maxFileSizeMB: 10,
  maxTotalSizeMB: 50,
  accept: [".pdf", ".jpg", ".jpeg", ".png"],
} as const;

/** Indian mobile number: optional +91 / 0 prefix, then 10 digits starting 6-9. */
export const INDIAN_PHONE_REGEX = /^(?:\+91[\s-]?|0)?[6-9]\d{9}$/;

/** NMC / State Medical Council registration number (loose format check). */
export const REG_NUMBER_REGEX = /^[A-Za-z0-9\-\/]{4,20}$/;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
