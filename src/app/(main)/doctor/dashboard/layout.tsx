import type { Metadata } from "next";
import { RequireAuth } from "@/lib/auth/RequireAuth";

export const metadata: Metadata = {
  title: "Specialist workspace",
  robots: { index: false, follow: false },
};

export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth role="doctor">{children}</RequireAuth>;
}
