"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import { AccountNav } from "@/lib/auth/AccountNav";
import { useAuth } from "@/lib/auth/AuthProvider";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#specialists", label: "Specialties" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/doctor/register", label: "For doctors" },
];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const menuButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  return <header onClickCapture={event => { if (event.target instanceof Element && event.target.closest("a")) setOpen(false); }} className="site-header sticky top-0 z-50 border-b border-white/8 bg-zinc-950/75 backdrop-blur-2xl">
    <div className="page-shell flex h-20 items-center justify-between gap-3">
      <BrandLogo />
      <nav aria-label="Primary" className="hidden lg:flex items-center gap-7">
        {links.map(link => <Link key={link.href} href={link.href} className="nav-link" aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
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
      <Link href={user ? "/account" : "/login"} onClick={() => setOpen(false)} className="flex py-3 text-sm text-brand-200">{user ? "Account settings" : "Sign in to your account"}</Link>
    </nav>}
  </header>;
}
