import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";

export function WorkspaceHeader({ eyebrow, title, description, children, back }: {
  eyebrow: string; title: string; description: React.ReactNode; children?: React.ReactNode; back?: { href: string; label: string };
}) {
  return <header className="mb-8">
    {back && <Link href={back.href} className="inline-flex items-center gap-2 text-xs text-zinc-400 mb-6 hover:text-brand-200"><ArrowLeft className="size-3.5" aria-hidden />{back.label}</Link>}
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
      <div><p className="eyebrow mb-3">{eyebrow}</p><h1 className="text-3xl sm:text-4xl font-medium tracking-[-.045em]">{title}</h1><p className="text-sm text-zinc-400 mt-3 leading-relaxed max-w-xl">{description}</p></div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  </header>;
}
export function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string | number; note: string; icon: LucideIcon }) {
  return <div className="glass-panel rounded-2xl p-5 flex justify-between gap-3"><div><p className="text-xs text-zinc-400">{label}</p><p className="text-3xl font-medium tracking-tight mt-3">{value}</p><p className="text-[11px] text-zinc-500 mt-2">{note}</p></div><Icon className="size-4 text-brand-200 mt-1" aria-hidden /></div>;
}
export function WorkspaceLoading({ label }: { label: string }) {
  return <div role="status" aria-label={label} className="space-y-4"><span className="sr-only">{label}</span>{[1,2].map(i=><div key={i} className="glass-panel rounded-3xl p-6 space-y-4" aria-hidden><div className="skeleton h-4 w-1/3" /><div className="skeleton h-3 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>)}</div>;
}
