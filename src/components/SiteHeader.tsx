"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { AccountNav } from "@/lib/auth/AccountNav";
import { useAuth } from "@/lib/auth/AuthProvider";
import { homeFor } from "@/lib/auth/email-link";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#specialists", label: "Specialties" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/doctor/register", label: "For doctors" },
];

export function SiteHeader() {
  // The panel is scoped to the route it was opened on, so navigating (including
  // browser back/forward) closes it without an effect that re-renders.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const { user, profile, logout } = useAuth();
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const open = openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedAt(null);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try { await logout(); setOpen(false); }
    catch { setSignOutError("Could not sign out. Check your connection and try again."); }
    finally { setSigningOut(false); }
  };

  return <header onClickCapture={event => { if (event.target instanceof Element && event.target.closest("a")) setOpen(false); }} className="site-header sticky top-0 z-50 border-b border-white/8 bg-zinc-950/75 backdrop-blur-2xl">
    <div className="page-shell flex h-20 items-center justify-between gap-3">
      <BrandLogo />
      <nav aria-label="Primary" className="hidden lg:flex items-center gap-7">
        {links.map(link => <Link key={link.href} href={link.href} className="nav-link" aria-current={link.href === pathname ? "page" : undefined}>{link.label}</Link>)}
      </nav>
      <div className="flex items-center gap-2 sm:gap-4">
        <AccountNav />
        <button ref={menuButton} type="button" className="lg:hidden flex size-11 items-center justify-center rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5"
          aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
    </div>
    {open && <nav id="mobile-navigation" aria-label="Mobile" className="page-shell lg:hidden border-t border-white/8 py-4">
      {links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex items-center justify-between py-3 text-sm text-zinc-200">{link.label}<ArrowUpRight className="size-4 text-zinc-500" aria-hidden /></Link>)}
      <div className="border-t border-white/8 mt-2 pt-2">
        {user ? <>
          <Link href={profile ? homeFor(profile.role) : "/auth/onboarding"} onClick={() => setOpen(false)} className="flex items-center gap-3 py-3 text-sm text-brand-200">
            <LayoutDashboard className="size-4" aria-hidden />{profile ? "Dashboard" : "Finish your account"}
          </Link>
          {profile?.status === "active" && <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 py-3 text-sm text-zinc-200">
            <UserRound className="size-4" aria-hidden />Account settings
          </Link>}
          <button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex w-full items-center gap-3 py-3 text-sm text-zinc-200 disabled:opacity-50">
            <LogOut className="size-4" aria-hidden />{signingOut ? "Signing out…" : "Sign out"}
          </button>
          {signOutError && <p role="alert" className="pb-3 text-xs text-red-300">{signOutError}</p>}
        </> : <>
          <Link href="/login" onClick={() => setOpen(false)} className="flex items-center justify-between py-3 text-sm text-brand-200">Sign in to your account<ArrowUpRight className="size-4 text-zinc-500" aria-hidden /></Link>
          <Link href="/register" onClick={() => setOpen(false)} className="primary-link w-full mt-2">Get a second opinion</Link>
        </>}
      </div>
    </nav>}
  </header>;
}
