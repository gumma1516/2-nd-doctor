import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Sign in",
  // Sign-in continuation URLs carry one-time credentials; never index them.
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>
    <header className="site-header border-b border-white/8 bg-zinc-950/75 backdrop-blur-2xl">
      <div className="page-shell flex h-20 items-center"><BrandLogo /></div>
    </header>
    <main id="main-content" className="flex-1 flex flex-col">{children}</main>
    <footer className="border-t border-white/8 mt-auto">
      <p className="page-shell py-6 text-xs text-zinc-500">
        Having trouble? Request a new sign-in link from the patient or doctor sign-in page.
      </p>
    </footer>
  </>;
}
