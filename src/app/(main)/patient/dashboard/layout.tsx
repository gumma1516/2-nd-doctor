import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/RequireAuth";

export const metadata: Metadata = {
  title: "My consultations",
  // Private workspace: keep it out of search indexes, not just robots.txt.
  robots: { index: false, follow: false },
};

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="patient">{children}</RequireAuth>;
}
