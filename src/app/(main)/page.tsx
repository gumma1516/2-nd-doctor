import { ArrowRight, ShieldCheck, FileText, Clock, Stethoscope, BadgeCheck, Check } from "lucide-react";
import Link from "next/link";
import { PRICING, SPECIALTIES, formatINR } from "@/lib/constants";

const STEPS = [
  {
    Icon: FileText,
    color: "blue",
    title: "1. Upload Records",
    body: "Securely upload your prescriptions, MRI/CT scans, blood reports and medical history in PDF, JPEG, PNG or DOCX.",
  },
  {
    Icon: Stethoscope,
    color: "teal",
    title: "2. Expert Review",
    body: "A specialist whose medical registration we have verified reviews your case in the relevant department.",
  },
  {
    Icon: Clock,
    color: "indigo",
    title: "3. Get Your Opinion",
    body: "Receive a detailed written opinion, with the option of a follow-up phone or video consultation.",
  },
] as const;

const COLOR: Record<string, string> = {
  blue: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  teal: "bg-teal-500/10 border-teal-500/20 text-teal-400",
  indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
};

const INCLUDED = [
  "Review by a verified specialist in your chosen department",
  "Detailed written second opinion",
  "Secure, access-controlled storage of your reports",
  "One follow-up clarification question",
];

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute top-0 inset-x-0 h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/20 via-zinc-950 to-zinc-950 -z-10" />
        <div className="absolute right-0 top-1/4 -translate-y-1/2 translate-x-1/3 size-[500px] rounded-full bg-brand-600/10 blur-3xl -z-10" />

        <div className="container mx-auto px-4 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium mb-8">
            <BadgeCheck className="size-4" aria-hidden />
            <span>Every specialist&apos;s medical registration is verified</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mb-6 leading-[1.1]">
            Trusted Second Opinions from{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-teal-400">
              Verified Specialists
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
            Unsure about your diagnosis or a recommended surgery? Upload your medical records and get a thorough review
            from an experienced specialist.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/patient/register"
              id="start-consultation-btn"
              className="group bg-white hover:bg-zinc-100 text-zinc-950 px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-2"
            >
              Start Your Consultation
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" aria-hidden />
            </Link>
            <Link
              href="#specialists"
              id="meet-doctors-btn"
              className="bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 hover:border-zinc-700 px-8 py-4 rounded-full text-lg font-medium transition-all shadow-sm flex items-center gap-2"
            >
              Explore Specialties
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-zinc-900 border-t border-zinc-800 scroll-mt-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How SecondCare Works</h2>
            <p className="text-lg text-zinc-400">A simple process designed for your peace of mind.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {STEPS.map(({ Icon, color, title, body }) => (
              <div
                key={title}
                className="bg-zinc-950 rounded-3xl p-8 border border-zinc-800 group hover:border-zinc-700 transition-colors"
              >
                <div
                  className={`size-12 rounded-2xl border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${COLOR[color]}`}
                >
                  <Icon className="size-6" aria-hidden />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-zinc-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section id="specialists" className="py-24 bg-zinc-950 scroll-mt-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Our Specialties</h2>
            <p className="text-lg text-zinc-400">
              Get reviewed by specialists across major disciplines. Every doctor&apos;s NMC / State Medical Council
              registration is manually verified before they can review cases.
            </p>
          </div>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SPECIALTIES.map((s) => (
              <li
                key={s}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-center text-zinc-200 font-medium hover:border-brand-500/50 hover:bg-brand-500/5 hover:text-white transition-colors"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-zinc-900 border-y border-zinc-800 scroll-mt-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-zinc-400">One flat fee per consultation. No hidden charges.</p>
          </div>
          <div className="relative rounded-[2rem] border border-brand-500/30 bg-zinc-950 p-10 shadow-[0_0_60px_rgba(37,99,235,0.12)] overflow-hidden">
            <div className="absolute -top-20 -right-20 size-64 bg-brand-500/10 blur-3xl rounded-full" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <p className="text-sm uppercase tracking-wider text-brand-400 font-semibold mb-2">Specialist Opinion</p>
                <p className="text-5xl font-extrabold text-white">{formatINR(PRICING.total)}</p>
                <p className="text-sm text-zinc-500 mt-2">
                  {formatINR(PRICING.consultationFee)} consultation + {formatINR(PRICING.platformFee)} platform fee (incl.
                  GST)
                </p>
              </div>
              <ul className="space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-300 text-sm">
                    <Check className="size-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/patient/register"
              id="pricing-cta-btn"
              className="relative z-10 mt-10 w-full inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-4 rounded-full font-semibold transition-all border border-brand-500/50"
            >
              Get Started <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-24 bg-zinc-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-gradient-to-br from-brand-900 to-zinc-900 rounded-[2.5rem] p-10 md:p-16 text-white text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-10 overflow-hidden relative border border-brand-800/50 shadow-2xl">
            <div className="absolute top-0 right-0 size-64 bg-brand-500/20 blur-3xl rounded-full" />
            <div className="max-w-xl z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Your Medical Data, Protected</h2>
              <p className="text-brand-100/80 text-lg leading-relaxed mb-8">
                Your records are encrypted in transit and at rest, and are only accessible to you and the specialist
                assigned to your case.
              </p>
              <ul className="space-y-4">
                {[
                  "Encrypted in transit (TLS) and at rest",
                  "Access limited to your assigned specialist",
                  "Explicit consent before any sharing",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-zinc-300">
                    <div className="size-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-3.5 text-brand-400" aria-hidden />
                    </div>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative z-10 flex-shrink-0" aria-hidden>
              <div className="size-48 rounded-full bg-gradient-to-br from-brand-500/30 to-brand-700/30 p-1 flex items-center justify-center shadow-[0_0_50px_rgba(59,130,246,0.3)] border border-brand-500/30">
                <div className="size-full bg-zinc-950 rounded-full flex items-center justify-center">
                  <ShieldCheck className="size-24 text-brand-500" />
                </div>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-zinc-600 max-w-2xl mx-auto">
            SecondCare provides second opinions based on the records you share and does not replace an in-person
            examination. In a medical emergency, call 112 or visit the nearest hospital.
          </p>
        </div>
      </section>
    </div>
  );
}
