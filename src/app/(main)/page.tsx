import Link from "next/link";
import { ArrowRight, ArrowUpRight, Activity, Brain, HeartPulse, Bone, Scan, Stethoscope, FileText, ShieldCheck, Check, LockKeyhole, ClipboardCheck, Upload, ChevronDown, Droplets, Wind, Soup } from "lucide-react";
import { PRICING, SPECIALTIES, formatINR } from "@/lib/constants";
import { FadeIn } from "@/components/FadeIn";

// One icon per specialty, in SPECIALTIES order.
const specialtyIcons = {
  Cardiology: HeartPulse, Neurology: Brain, Oncology: Scan, Orthopedics: Bone,
  Nephrology: Activity, Pulmonology: Wind, Gastroenterology: Soup, Urology: Droplets,
} as const;
const steps = [
  { number: "01", icon: Upload, title: "Share your story.", text: "Choose a specialty, describe your concerns, and upload the reports that matter." },
  { number: "02", icon: Stethoscope, title: "Get a specialist perspective.", text: "After payment, your case is matched with an available, verified doctor in your chosen specialty." },
  { number: "03", icon: ClipboardCheck, title: "Move forward with clarity.", text: "Read your specialist’s written opinion and revisit your records in your private dashboard." },
];
const questions = [
  { question: "How is my specialist selected?", answer: "Your consultation is assigned to an available, verified doctor in the specialty you choose. If a specialist is not immediately available, the request remains in the assignment queue and its status is shown in your dashboard." },
  { question: "Which records should I share?", answer: "Share relevant prescriptions, scan reports, test results, discharge summaries, and your current diagnosis. You can upload PDF, JPG, PNG, and DOCX files. The consultation form shows the file and size limits before you upload." },
  { question: "Where will I receive my second opinion?", answer: "Your specialist’s written opinion appears in your patient dashboard when the review is complete. You can also see your submitted reports and the consultation’s current status there." },
  { question: "Who can access my medical records?", answer: "Your records are available to you, the specialist assigned to your case, and authorized administrators who manage the service. Review the privacy policy before sharing your information." },
  { question: "Is this suitable for urgent medical concerns?", answer: "SecondCare is for reviewing the records you share and does not replace an in-person examination or emergency care. In a medical emergency, call 112 or visit the nearest hospital." },
];

function ConsultationPreview() {
  return <div className="relative w-full max-w-[480px] mx-auto lg:ml-auto pt-6 pb-12">
    <div className="absolute inset-12 rounded-full bg-brand-300/8 blur-[70px]" aria-hidden />
    <div className="glass-panel rounded-[28px] overflow-hidden relative">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-white/2">
        <div className="flex gap-1.5" aria-hidden><span className="size-2 rounded-full bg-zinc-700" /><span className="size-2 rounded-full bg-zinc-700" /><span className="size-2 rounded-full bg-brand-300/70" /></div>
        <span className="text-[10px] tracking-[.16em] uppercase text-zinc-400">Your care workspace · Preview</span>
      </div>
      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-7">
          <div className="flex items-center gap-3"><span className="icon-tile"><HeartPulse className="size-6" aria-hidden /></span><div><p className="text-base font-medium tracking-tight">Cardiology review</p><p className="text-xs text-zinc-400 mt-1">A second perspective on your care</p></div></div>
          <span className="size-8 rounded-full border border-white/10 flex items-center justify-center"><ArrowUpRight className="size-4 text-zinc-400" aria-hidden /></span>
        </div>
        <div className="relative rounded-2xl border border-brand-300/15 bg-brand-300/3 px-5 py-5 mb-5 overflow-hidden">
          <div className="flex justify-between text-[10px] uppercase tracking-[.13em] text-zinc-400"><span>More perspective. More clarity.</span><Activity className="size-3.5 text-brand-300" aria-hidden /></div>
          <svg viewBox="0 0 360 75" className="w-full h-20 mt-2" fill="none" aria-hidden>
            <defs><linearGradient id="pulse-gradient"><stop stopColor="#71ead2" /><stop offset="1" stopColor="#abb1ff" /></linearGradient></defs>
            <path d="M0 48H60l10-7 10 7h27l14-22 15 42 18-60 16 54 13-26 12 12h165" stroke="url(#pulse-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="preview-line" />
            <path d="M0 72H360" stroke="#ffffff08" />
          </svg>
          <p className="text-xs text-zinc-300">Your records. A specialist’s expertise.</p>
        </div>
        <p className="text-[10px] tracking-[.15em] uppercase text-zinc-500 mb-3">Everything in one place</p>
        {["Medical report.pdf", "Prescription.pdf"].map((file, i) => <div key={file} className="flex items-center gap-3 rounded-xl bg-zinc-950/45 border border-white/6 p-3 mb-2">
          <FileText className="size-4 text-[#abb1ff]" aria-hidden /><span className="text-xs text-zinc-200 flex-1">{file}</span><span className="text-[10px] text-zinc-500">{i === 0 ? "Report" : "Record"}</span><Check className="size-3.5 text-brand-300" aria-hidden />
        </div>)}
        <div className="grid grid-cols-3 gap-2 mt-6 pt-5 border-t border-white/8">
          {["Submit records", "Specialist review", "Written opinion"].map((label, i) => <div key={label}><span className="inline-flex size-5 items-center justify-center rounded-full text-[9px] border border-brand-300/25 bg-brand-300/8 text-brand-200">{i + 1}</span><p className="text-[10px] text-zinc-400 mt-2">{label}</p></div>)}
        </div>
      </div>
    </div>
    <div className="preview-float relative sm:absolute sm:-left-5 sm:bottom-0 glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 w-fit mx-auto mt-4 sm:mt-0">
      <span className="size-9 bg-brand-300/10 rounded-xl flex items-center justify-center"><ShieldCheck className="size-5 text-brand-300" aria-hidden /></span><div><p className="text-xs font-medium">A private space for your health</p><p className="text-[10px] text-zinc-400 mt-1">Records shared for specialist review</p></div>
    </div>
  </div>;
}

export default function Home() {
  return <div>
    <section className="page-shell grid lg:grid-cols-[1.08fr_1fr] items-center gap-10 lg:gap-14 pt-14 pb-16 md:pt-20 md:pb-24">
      <FadeIn>
        <span className="eyebrow"><span className="size-1.5 bg-brand-300 rounded-full" /> A fresh perspective on your health</span>
        <h1 className="text-[clamp(2.7rem,5.5vw,4.6rem)] font-medium tracking-[-.065em] leading-[1.06] mt-6 mb-6">A second opinion.<br /><span className="gradient-text">A clearer path<br className="hidden xl:block" /> forward.</span></h1>
        <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-[440px]">Make sense of your diagnosis and treatment options with a written second opinion from a verified specialist.</p>
        <div className="flex flex-col min-[400px]:flex-row gap-3 mt-8">
          <Link href="/patient/register" id="hero-cta-btn" className="primary-link">Get a second opinion <ArrowRight className="size-4" aria-hidden /></Link>
          <Link href="#how-it-works" className="secondary-link">Explore how it works</Link>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 mt-7 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-brand-300" aria-hidden /> Verified specialists</span>
          <span className="inline-flex items-center gap-2"><LockKeyhole className="size-3.5 text-brand-300" aria-hidden /> Private records</span>
        </div>
      </FadeIn>
      <FadeIn delay={0.15}><ConsultationPreview /></FadeIn>
    </section>

    <div className="border-y border-white/8 bg-white/[.015]">
      <div className="page-shell grid sm:grid-cols-3 gap-5 py-6">
        {[["Expertise that fits", "Matched to your chosen specialty", Stethoscope], ["Your care, organized", "Reports and opinions in one workspace", FileText], ["One clear price", formatINR(PRICING.total) + " per consultation", Check]].map(([title, text, Icon]) => {
          const I = Icon as typeof Check;
          return <div key={title as string} className="flex items-center gap-3 sm:justify-center"><I className="size-5 text-brand-300 shrink-0" strokeWidth={1.5} aria-hidden /><div><p className="text-xs font-medium text-zinc-200">{title as string}</p><p className="text-[11px] text-zinc-500 mt-1">{text as string}</p></div></div>;
        })}
      </div>
    </div>

    <section id="how-it-works" className="page-shell section-space">
      <FadeIn><div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10">
        <div><p className="eyebrow mb-4">Designed around you</p><h2 className="section-title">From uncertainty<br />to understanding.</h2></div>
        <p className="max-w-sm text-sm text-zinc-400 leading-relaxed">A straightforward process that keeps your records, specialist review, and next steps connected.</p>
      </div></FadeIn>
      <div className="grid md:grid-cols-3 gap-4">
        {steps.map(({ number, icon: Icon, title, text }, i) => <FadeIn delay={i * .08} key={number}>
          <div className="glass-panel interactive-card rounded-3xl p-7 h-full">
            <div className="flex items-center justify-between mb-8"><span className="icon-tile"><Icon className="size-5" strokeWidth={1.5} aria-hidden /></span><span className="font-mono text-xs text-zinc-600">{number}</span></div>
            <h3 className="text-lg font-medium tracking-tight mb-3">{title}</h3><p className="text-sm text-zinc-400 leading-relaxed">{text}</p>
          </div>
        </FadeIn>)}
      </div>
    </section>

    <section id="specialists" className="page-shell section-space border-t border-white/8">
      <FadeIn><div className="text-center max-w-xl mx-auto mb-10"><p className="eyebrow mb-4">The right expertise</p><h2 className="section-title">Different specialties.<br /><span className="text-zinc-400">One thoughtful review.</span></h2><p className="text-sm text-zinc-400 leading-relaxed mt-5">Choose the specialty that fits your concern. Doctors complete registration verification before they can review cases.</p></div></FadeIn>
      <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SPECIALTIES.map((specialty) => {
          const Icon = specialtyIcons[specialty];
          return <li key={specialty}><Link href={"/patient/register?specialty=" + encodeURIComponent(specialty)} className="glass-panel interactive-card rounded-2xl p-5 flex flex-col gap-5 h-full group" aria-label={"Get a second opinion in " + specialty}>
            <div className="flex justify-between items-start"><Icon className="size-6 text-brand-200" strokeWidth={1.4} aria-hidden /><ArrowUpRight className="size-3.5 text-zinc-600 group-hover:text-brand-200 transition-colors" aria-hidden /></div><span className="text-[13px] font-medium">{specialty}</span>
          </Link></li>;
        })}
      </ul>
    </section>

    <section className="page-shell section-space">
      <div className="grid md:grid-cols-[1.25fr_1fr] gap-4">
        <FadeIn className="h-full"><div className="glass-panel rounded-3xl p-8 md:p-10 h-full overflow-hidden">
          <span className="icon-tile mb-8"><ShieldCheck className="size-6" strokeWidth={1.5} aria-hidden /></span>
          <p className="eyebrow mb-4">Personal information. Thoughtful care.</p><h2 className="section-title max-w-sm">Your records deserve<br />a private space.</h2>
          <p className="text-sm text-zinc-400 mt-5 leading-relaxed max-w-md">Keep your medical history and specialist opinions together. Records are shared with your assigned doctor and authorized administrators who manage your care request.</p>
          <Link href="/privacy" className="inline-flex items-center gap-2 text-xs text-brand-200 mt-6 hover:text-white">How we handle your information <ArrowUpRight className="size-3.5" aria-hidden /></Link>
        </div></FadeIn>
        <div className="grid gap-4">
          <FadeIn delay={.08}><div className="glass-panel rounded-3xl p-7 flex items-start gap-5"><span className="icon-tile"><Stethoscope className="size-5" aria-hidden /></span><div><h3 className="font-medium text-lg tracking-tight">Expertise, verified.</h3><p className="text-sm text-zinc-400 leading-relaxed mt-2">Doctor credentials are checked before a specialist can receive a case.</p></div></div></FadeIn>
          <FadeIn delay={.16}><div className="glass-panel rounded-3xl p-7 flex items-start gap-5"><span className="icon-tile border-[#abb1ff]/20! bg-[#abb1ff]/5! text-[#abb1ff]!"><ClipboardCheck className="size-5" aria-hidden /></span><div><h3 className="font-medium text-lg tracking-tight">Clarity you can revisit.</h3><p className="text-sm text-zinc-400 leading-relaxed mt-2">A written opinion stays alongside your reports, ready for your next care conversation.</p></div></div></FadeIn>
        </div>
      </div>
    </section>

    <section id="pricing" className="page-shell section-space border-t border-white/8">
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        <FadeIn><p className="eyebrow mb-4">Less guesswork</p><h2 className="section-title">A clear perspective.<br /><span className="text-zinc-400">At a clear price.</span></h2><p className="text-sm text-zinc-400 leading-relaxed max-w-sm mt-5">One fee for your specialist’s review. See the complete cost before you submit payment.</p><div className="mt-7 inline-flex items-center gap-2 text-xs text-zinc-300"><LockKeyhole className="size-4 text-brand-300" aria-hidden /> Payment confirmed before specialist assignment</div></FadeIn>
        <FadeIn delay={.1}><div className="glass-panel rounded-3xl p-7 sm:p-9 border-brand-300/25!">
          <div className="flex justify-between items-center gap-2"><p className="text-sm font-medium">Specialist second opinion</p><span className="status-pill">One consultation</span></div>
          <p className="text-5xl tracking-[-.06em] font-medium mt-7">{formatINR(PRICING.total).replace(".00", "")}<span className="text-sm text-zinc-500 tracking-normal font-normal"> / review</span></p>
          <p className="text-xs text-zinc-400 mt-3">{formatINR(PRICING.consultationFee)} consultation + {formatINR(PRICING.platformFee)} platform fee (incl. GST)</p>
          <ul className="border-t border-white/10 mt-7 pt-6 space-y-3">{["Review by a verified specialist", "A written second opinion", "Access to your submitted records", "Consultation status in your dashboard"].map(item => <li key={item} className="text-sm text-zinc-300 flex gap-3"><Check className="size-4 text-brand-300 shrink-0 mt-0.5" aria-hidden />{item}</li>)}</ul>
          <Link href="/patient/register" id="pricing-cta-btn" className="primary-link w-full mt-8">Start your consultation <ArrowRight className="size-4" aria-hidden /></Link>
        </div></FadeIn>
      </div>
    </section>

    <section className="page-shell section-space border-t border-white/8">
      <div className="grid md:grid-cols-[.75fr_1.25fr] gap-10 md:gap-16"><div><p className="eyebrow mb-4">A little more clarity</p><h2 className="section-title">Good questions.<br />Clear answers.</h2></div><div>{questions.map(({ question, answer }) => <details key={question} className="group border-b border-white/10 first:border-t py-5">
        <summary className="list-none flex items-center justify-between gap-5 text-sm font-medium text-zinc-200">{question}<ChevronDown className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden /></summary><p className="text-sm text-zinc-400 leading-relaxed pt-4 pr-5">{answer}</p>
      </details>)}</div></div>
    </section>

    <section className="page-shell pb-16">
      <FadeIn><div className="glass-panel rounded-[28px] p-8 md:p-12 flex flex-col md:flex-row md:items-center justify-between gap-8 overflow-hidden"><div><p className="eyebrow mb-4">Your next step starts here</p><h2 className="section-title">Make room for<br /><span className="gradient-text">a second perspective.</span></h2></div><Link href="/patient/register" className="primary-link shrink-0">Get a second opinion <ArrowRight className="size-4" aria-hidden /></Link></div></FadeIn>
      <p className="text-xs text-zinc-500 text-center leading-relaxed max-w-2xl mx-auto mt-8">SecondCare provides opinions based on your submitted records and does not replace an in-person examination. In a medical emergency, call 112 or visit the nearest hospital.</p>
    </section>
  </div>;
}
