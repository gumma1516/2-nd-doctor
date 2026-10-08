import Link from "next/link";
import { ArrowRight, HeartPulse, Stethoscope, Check, ShieldCheck } from "lucide-react";
import { FadeIn } from "./FadeIn";

export function RoleSelection({ mode }: { mode: "login" | "register" }) {
  const login = mode === "login";
  return <div className="page-shell workspace-shell max-w-[920px]">
    <FadeIn><div className="text-center max-w-xl mx-auto mb-10">
      <p className="eyebrow mb-4">{login ? "Your private workspace" : "A clearer path forward"}</p>
      <h1 className="text-4xl sm:text-5xl font-medium tracking-[-.05em]">{login ? "Welcome back." : "How can we help you?"}</h1>
      <p className="text-zinc-400 text-sm leading-relaxed mt-5">{login ? "Choose your account to pick up where you left off." : "Find a specialist’s perspective, or share your expertise with patients seeking clarity."}</p>
    </div></FadeIn>
    <div className="grid sm:grid-cols-2 gap-5">
      {[{ role: "patient", icon: HeartPulse, title: "I’m a patient", text: "A second perspective on your diagnosis and care.", features: ["Share your medical records", "Connect with a verified specialist", "Receive a written opinion"], cta: login ? "Patient sign in" : "Get a second opinion" },
        { role: "doctor", icon: Stethoscope, title: "I’m a doctor", text: "Bring your expertise to meaningful second opinions.", features: ["Complete credential verification", "Review cases in your specialty", "Manage opinions in one place"], cta: login ? "Doctor sign in" : "Join as a specialist" }
      ].map(({ role, icon: Icon, title, text, features, cta }, i) => <FadeIn key={role} delay={i * .08}>
        <Link href={"/" + role + "/" + mode} id={role + "-" + mode + "-link"} className="glass-panel interactive-card rounded-3xl p-7 sm:p-8 flex flex-col h-full group">
          <span className={role === "doctor" ? "icon-tile text-[#abb1ff]! bg-[#abb1ff]/8! border-[#abb1ff]/20!" : "icon-tile"}><Icon className="size-6" strokeWidth={1.5} aria-hidden /></span>
          <h2 className="text-2xl tracking-tight font-medium mt-7">{title}</h2><p className="text-sm text-zinc-400 leading-relaxed mt-3">{text}</p>
          <ul className="space-y-3 my-7">{features.map(feature => <li key={feature} className="flex gap-2.5 text-xs text-zinc-300"><Check className="size-3.5 text-brand-300 shrink-0" aria-hidden />{feature}</li>)}</ul>
          <span className="flex items-center justify-between mt-auto pt-5 border-t border-white/10 text-sm text-brand-200">{cta}<ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" aria-hidden /></span>
        </Link>
      </FadeIn>)}
    </div>
    <div className="flex flex-col items-center gap-4 mt-8 text-xs text-zinc-400">
      <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-brand-300" aria-hidden /> One private space for your care journey.</span>
      <p>{login ? "New to SecondCare? " : "Already have an account? "}<Link href={login ? "/register" : "/login"} className="text-brand-200 hover:underline">{login ? "Create an account" : "Sign in"}</Link></p>
    </div>
  </div>;
}
