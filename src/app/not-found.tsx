import Link from "next/link";
import { Compass } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-20">
      <div className="glass-panel rounded-3xl p-8 sm:p-10 max-w-md w-full text-center">
        <div className="flex justify-center"><span className="icon-tile"><Compass className="size-6" strokeWidth={1.6} aria-hidden /></span></div>
        <p className="eyebrow mt-6">Error 404</p>
        <h1 className="text-2xl font-medium tracking-[-.03em] mt-3">This page isn’t here.</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mt-3">
          The page you’re looking for doesn’t exist or has moved. Your consultations and records are
          unaffected.
        </p>
        <div className="flex flex-col min-[380px]:flex-row gap-3 mt-8">
          <Link href="/" id="not-found-home-link" className="primary-link flex-1">Back to home</Link>
          <Link href="/login" className="secondary-link flex-1">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
