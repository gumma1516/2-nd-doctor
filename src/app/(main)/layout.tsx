import Link from "next/link";
import { AccountNav } from "@/lib/auth/AccountNav";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-brand-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" aria-label="SecondCare home">
            <div className="size-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-inner">
              <svg className="size-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">SecondCare</span>
          </Link>
          <nav aria-label="Primary" className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="/#how-it-works" className="hover:text-brand-400 transition-colors">How it Works</Link>
            <Link href="/#specialists" className="hover:text-brand-400 transition-colors">Specialties</Link>
            <Link href="/#pricing" className="hover:text-brand-400 transition-colors">Pricing</Link>
          </nav>
          <AccountNav />
        </div>
      </header>
      <main id="main-content" className="flex-1 flex flex-col">
        {children}
      </main>
      <footer className="border-t border-zinc-800 bg-zinc-950 py-12 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <p>&copy; {new Date().getFullYear()} SecondCare. All rights reserved.</p>
          <nav aria-label="Legal" className="flex items-center gap-6">
            <Link href="/privacy" id="footer-privacy-link" className="hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" id="footer-terms-link" className="hover:text-zinc-300 transition-colors">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
