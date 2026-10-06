import type { Metadata } from "next";
import { EmailAuthForm } from "@/components/EmailAuthForm";

export const metadata: Metadata = { title: "Patient Registration" };

export default function PatientRegister() {
  return <EmailAuthForm mode="register" role="patient" />;
}
