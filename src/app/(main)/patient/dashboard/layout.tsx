"use client";

import { RequireAuth } from "@/lib/auth/RequireAuth";

export default function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth role="patient">{children}</RequireAuth>;
}
