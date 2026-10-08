"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AuthError, FullPageLoader } from "@/lib/auth/RequireAuth";
import { homeFor } from "@/lib/auth/email-link";

export default function ChooseAccountRole() {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading || error) return;
    if (!user) router.replace("/login");
    else if (profile) router.replace(homeFor(profile.role));
  }, [user, profile, loading, error, router]);
  if (error) return <AuthError />;
  if (loading || !user || profile) return <FullPageLoader />;
  return <div className="flex-1 flex items-center justify-center px-4 py-24">
    <Card className="w-full max-w-md space-y-6 text-center">
      <h1 className="text-2xl font-medium tracking-tight text-white">Choose your account</h1>
      <p className="text-zinc-400">How will you use SecondCare?</p>
      <Link className="block rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white" href="/patient/onboarding">I am a patient</Link>
      <Link className="block rounded-xl bg-teal-600 px-4 py-3 font-semibold text-white" href="/doctor/onboarding">I am a doctor</Link>
    </Card>
  </div>;
}
