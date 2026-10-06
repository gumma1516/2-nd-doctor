import type { Metadata } from "next";
import { EmailAuthForm } from "@/components/EmailAuthForm";

export const metadata: Metadata = { title: "Patient Login" };

export default function PatientLogin() {
  return <EmailAuthForm mode="login" role="patient" />;
}
