export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 bg-zinc-950 py-16 px-4">
      <article className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-sm text-zinc-500 mb-6">Last updated: {updated}</p>
        <div className="mb-10 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Draft template: must be reviewed by qualified legal counsel (DPDP Act 2023, Telemedicine Practice
          Guidelines 2020) before launch.
        </div>
        <div className="space-y-8 text-zinc-300 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
      </article>
    </div>
  );
}
