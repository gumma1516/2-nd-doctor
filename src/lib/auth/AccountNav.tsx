"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { homeFor } from "./email-link";

export function AccountNav() {
  const { user, profile, loading, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (loading) return <span className="text-sm text-zinc-500" role="status">Loading account…</span>;
  if (!user) return <div className="flex items-center gap-3 sm:gap-4">
    <Link href="/login" id="login-nav-btn" className="text-sm font-medium text-zinc-400 hover:text-white">Log In</Link>
    <Link href="/register" id="get-opinion-nav-btn" className="rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">
      Get Started
    </Link>
  </div>;
  const signOut = async () => {
    setBusy(true);
    setError(null);
    try { await logout(); }
    catch { setError("Could not sign out. Try again."); }
    finally { setBusy(false); }
  };
  return <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
    <Link href={profile ? homeFor(profile.role) : "/auth/onboarding"} className="font-medium text-brand-400 hover:text-brand-300">
      {profile ? "Dashboard" : "Finish account"}
    </Link>
    <button disabled={busy} onClick={() => void signOut()} className="text-zinc-400 hover:text-white disabled:opacity-50">
      {busy ? "Signing out…" : "Sign out"}
    </button>
    {error && <span className="w-full text-right text-xs text-red-400" role="alert">{error}</span>}
  </div>;
}
