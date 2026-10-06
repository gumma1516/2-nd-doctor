"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { useAuth } from "./AuthProvider";
import { homeFor } from "./email-link";
import type { Role } from "@/lib/data/types";

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center gap-3 bg-zinc-950 text-zinc-500 py-24" role="status">
      <Loader2 className="size-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

const loginFor = (role?: Role) => (role === "patient" || role === "doctor" ? `/${role}/login` : "/login");

export function AuthError() {
  const { error, retry, logout } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 px-4 py-24">
      <Card className="max-w-md text-center space-y-4">
        <h1 className="text-xl font-bold text-white">Unable to load your account</h1>
        <p role="alert" className="text-zinc-400">{signOutError ?? error}</p>
        <Button onClick={retry}>Try again</Button>
        <button className="text-zinc-400 hover:text-white" onClick={() => void logout().catch(() => setSignOutError("Could not sign out. Check your connection and try again."))}>Sign out</button>
      </Card>
    </div>
  );
}

/**
 * Client-side route guard (UX only). The real protection is firestore.rules /
 * storage.rules, which reject any request not made by the data's owner.
 */
export function RequireAuth({ role, children }: { role?: Role; children: React.ReactNode }) {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();

  let target: string | null = null;
  if (!loading && !error) {
    if (!user) target = loginFor(role);
    else if (!profile) target = role === "doctor" || role === "patient" ? `/${role}/onboarding` : "/auth/onboarding";
    else if (role && profile.role !== role) target = homeFor(profile.role);
  }

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  if (error) return <AuthError />;
  if (loading || target) return <FullPageLoader />;

  if (profile?.status !== "active") {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 py-12 px-4">
        <Card className="max-w-md w-full text-center">
          <ShieldOff className="size-10 text-red-400 mx-auto mb-4" aria-hidden />
          <h1 className="text-xl font-bold text-white mb-2">Account disabled</h1>
          <p className="text-zinc-400 mb-6">Your account has been disabled. Contact support for help.</p>
          <Link href="/" className="text-brand-400 hover:text-brand-300 font-medium">Back to home</Link>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
