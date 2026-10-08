import Link from "next/link";
import { HeartPulse } from "lucide-react";

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <Link href="/" className="inline-flex items-center gap-2.5 shrink-0" aria-label="SecondCare home">
    <span className="size-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-100 to-brand-300 border border-brand-100/70 shadow-[0_2px_20px_#71ead21a]">
      <HeartPulse className="size-5 text-brand-950" strokeWidth={1.8} aria-hidden />
    </span>
    <span className={compact ? "text-lg font-semibold tracking-[-.04em]" : "text-[1.2rem] font-semibold tracking-[-.04em]"}>second<span className="text-brand-200">care</span><span className="text-brand-300">.</span></span>
  </Link>;
}
