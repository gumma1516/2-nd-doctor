import type { Metadata } from "next";
import { EmailAuthForm } from "@/components/EmailAuthForm";

export const metadata: Metadata = { title: "Doctor Login" };

export default function DoctorLogin() {
  return <EmailAuthForm mode="login" role="doctor" />;
}
