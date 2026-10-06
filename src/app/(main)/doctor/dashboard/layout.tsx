"use client";

import { RequireAuth } from "@/lib/auth/RequireAuth";

export default function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RequireAuth role="doctor">{children}</RequireAuth>;
}
