"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, HeartPulse, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AuthError, FullPageLoader } from "@/lib/auth/RequireAuth";
import { homeFor } from "@/lib/auth/email-link";

const CHOICES = [
  { href: "/patient/onboarding", icon: HeartPulse, title: "I’m a patient", text: "Share your records and receive a written second opinion." },
  { href: "/doctor/onboarding", icon: Stethoscope, title: "I’m a doctor", text: "Verify your credentials and review cases in your specialty." },
] as const;

export default function ChooseAccountRole() {
  const { user, profile, loading, error } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading || error) return;
    if (!user) router.replace("/login");
    else if (profile) router.replace(homeFor(profile.role));
  }, [user, profile, loading, error, router]);
  if (error) return <AuthError />;
  if (loading || !user || profile) return <FullPageLoader />;
  return <div className="flex-1 flex items-center justify-center px-5 py-20">
    <Card className="w-full max-w-md">
      <p className="eyebrow mb-4">One last step</p>
      <h1 className="text-2xl font-medium tracking-[-.03em]">Choose your account</h1>
      <p className="text-sm text-zinc-400 leading-relaxed mt-3">
        You’re signed in as <span className="text-zinc-200 break-all">{user.email}</span>. How will you
        use SecondCare?
      </p>
      <ul className="space-y-3 mt-7">
        {CHOICES.map(({ href, icon: Icon, title, text }) => <li key={href}>
          <Link href={href} className="glass-panel interactive-card rounded-2xl p-5 flex items-center gap-4 group">
            <span className="icon-tile"><Icon className="size-5" strokeWidth={1.5} aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-xs text-zinc-400 leading-relaxed mt-1">{text}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-zinc-500 group-hover:text-brand-200 group-hover:translate-x-1 transition-all" aria-hidden />
          </Link>
        </li>)}
      </ul>
      <p className="text-xs text-zinc-500 leading-relaxed border-t border-white/10 pt-5 mt-7">
        Your choice decides which workspace you see. Contact support if you need it changed later.
      </p>
    </Card>
  </div>;
}
