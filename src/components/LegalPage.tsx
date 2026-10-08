export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <div className="page-shell workspace-shell max-w-[920px]">
    <p className="eyebrow mb-4">Care, with transparency</p><h1 className="text-4xl sm:text-5xl font-medium tracking-[-.05em] mb-4">{title}</h1>
    <p className="text-xs text-zinc-500 mb-8">Last updated: {updated}</p>
    <div className="mb-8 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-200">Draft template: must be reviewed by qualified legal counsel (DPDP Act 2023, Telemedicine Practice Guidelines 2020) before launch.</div>
    <article className="glass-panel rounded-3xl p-6 sm:p-10 space-y-8 text-sm text-zinc-300 leading-[1.85] [&_h2]:text-xl [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-white [&_h2]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2">{children}</article>
  </div>;
}
