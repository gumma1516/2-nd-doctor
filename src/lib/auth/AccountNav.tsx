"use client";
import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { homeFor } from "./email-link";

/** `alwaysShowSignOut` is for surfaces without a mobile menu of their own (the admin sidebar). */
export function AccountNav({ alwaysShowSignOut = false }: { alwaysShowSignOut?: boolean } = {}) {
  const { user, profile, loading, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (loading) return <span className="size-8 rounded-full skeleton" role="status" aria-label="Loading account" />;
  if (!user) return <div className="flex items-center gap-5">
    <Link href="/login" id="login-nav-btn" className="hidden sm:inline nav-link">Sign in</Link>
    <Link href="/register" id="get-opinion-nav-btn" aria-label="Get started" className="primary-link min-h-10! px-3.5! py-2! text-xs!"><span className="hidden min-[360px]:inline">Get started</span><span className="min-[360px]:hidden">Start</span> <span className="hidden sm:inline" aria-hidden>↗</span></Link>
  </div>;
  const signOut = async () => {
    setBusy(true); setError(null);
    try { await logout(); }
    catch { setError("Could not sign out. Try again."); }
    finally { setBusy(false); }
  };
  return <div className="relative flex items-center gap-1 sm:gap-3 text-xs">
    <Link href={profile ? homeFor(profile.role) : "/auth/onboarding"} className="flex items-center justify-center min-h-10 px-2 text-brand-200 gap-2" aria-label={profile ? "Dashboard" : "Finish account"}>
      <LayoutDashboard className="size-4" aria-hidden /><span className="hidden sm:inline">{profile ? "Dashboard" : "Finish account"}</span>
    </Link>
    {profile?.status === "active" && <Link href="/account" className="flex size-10 items-center justify-center text-zinc-400 hover:text-white rounded-xl hover:bg-white/5" aria-label="Account settings"><UserRound className="size-4" aria-hidden /></Link>}
    <button disabled={busy} onClick={() => void signOut()} aria-label={busy ? "Signing out" : "Sign out"} className={(alwaysShowSignOut ? "flex" : "hidden sm:flex") + " size-10 items-center justify-center text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 disabled:opacity-50"}><LogOut className="size-4" aria-hidden /></button>
    {error && <span className="absolute top-12 right-0 w-60 glass-panel rounded-xl p-3 text-xs text-red-300" role="alert">{error}</span>}
  </div>;
}
