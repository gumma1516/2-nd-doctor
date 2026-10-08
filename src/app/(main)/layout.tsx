import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BrandLogo } from "@/components/BrandLogo";
import { PageTransition } from "@/components/PageTransition";

export default function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-brand-200 focus:text-brand-950 focus:px-4 focus:py-3 focus:rounded-xl">Skip to content</a>
    <SiteHeader />
    <main id="main-content" className="flex-1 flex flex-col"><PageTransition>{children}</PageTransition></main>
    <footer className="border-t border-white/8 mt-auto">
      <div className="page-shell py-12">
        <div className="flex flex-col sm:flex-row justify-between gap-10 mb-10">
          <div className="max-w-sm"><BrandLogo /><p className="text-sm text-zinc-400 leading-relaxed mt-4">A clearer perspective on your health.<br />Specialist expertise, in one private workspace.</p></div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
            <div className="flex flex-col gap-3"><span className="text-xs text-zinc-500">Your next step</span><Link className="nav-link" href="/patient/register">Get a second opinion</Link><Link className="nav-link" href="/doctor/register">Join as a specialist <ArrowUpRight className="inline size-3.5" aria-hidden /></Link></div>
            <div className="flex flex-col gap-3"><span className="text-xs text-zinc-500">Useful links</span><Link className="nav-link" href="/#how-it-works">How it works</Link><Link className="nav-link" href="/#pricing">Consultation pricing</Link></div>
          </nav>
        </div>
        <div className="border-t border-white/8 pt-6 flex flex-col md:flex-row justify-between gap-5 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} SecondCare. All rights reserved.</p>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="size-3.5 text-brand-300" aria-hidden /> Medical records stay in your private workspace</span>
          <nav aria-label="Legal" className="flex items-center gap-5"><Link href="/privacy" id="footer-privacy-link" className="hover:text-white">Privacy</Link><Link href="/terms" id="footer-terms-link" className="hover:text-white">Terms</Link></nav>
        </div>
      </div>
    </footer>
  </>;
}
