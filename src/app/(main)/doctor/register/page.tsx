import type { Metadata } from "next";
import { EmailAuthForm } from "@/components/EmailAuthForm";

export const metadata: Metadata = { title: "Doctor Registration" };

export default function DoctorRegister() {
  return <EmailAuthForm mode="register" role="doctor" />;
}
