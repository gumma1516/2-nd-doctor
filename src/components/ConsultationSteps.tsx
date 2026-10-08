import { Check } from "lucide-react";
const steps = [{ id: "details", label: "Your details & records" }, { id: "payment", label: "Review & payment" }, { id: "review", label: "Specialist opinion" }];
export function ConsultationSteps({ current }: { current: "details" | "payment" | "review" }) {
  const index = steps.findIndex(step => step.id === current);
  return <ol aria-label="Consultation steps" className="grid grid-cols-3 gap-3 mb-8">
    {steps.map((step, i) => <li key={step.id} aria-current={current === step.id ? "step" : undefined} className="flex items-center gap-2.5 border-b border-white/10 pb-4">
      <span className={i <= index ? "flex size-6 items-center justify-center shrink-0 rounded-full border border-brand-300/30 bg-brand-300/10 text-brand-200 text-[10px]" : "flex size-6 items-center justify-center shrink-0 rounded-full border border-white/10 text-zinc-500 text-[10px]"}>{i < index ? <Check className="size-3" aria-hidden /> : i + 1}</span>
      <span className={i === index ? "text-[10px] sm:text-xs text-zinc-200" : "text-[10px] sm:text-xs text-zinc-500"}>{step.label}</span>
    </li>)}
  </ol>;
}
