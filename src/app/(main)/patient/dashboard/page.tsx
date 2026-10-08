"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, FileText, Clock3, CircleCheck, RefreshCw, ArrowRight, HeartPulse } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { PrivateFileList } from "@/components/PrivateFileList";
import { MetricCard, WorkspaceHeader, WorkspaceLoading } from "@/components/WorkspaceUI";
import { formatINR } from "@/lib/constants";
import { useAuth } from "@/lib/auth/AuthProvider";
import { displayCaseId, listMyCases } from "@/lib/data/cases";
import { toDate, type Case } from "@/lib/data/types";
import { errorMessage } from "@/lib/errors";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listMyCases(user.uid).then(data => { if (!cancelled) setCases(data); })
      .catch((err: unknown) => { if (!cancelled) setError(errorMessage(err, "Could not load your consultations.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, revision]);
  const refresh = () => { setLoading(true); setError(null); setRevision(value => value + 1); };
  return <div className="page-shell workspace-shell">
    <WorkspaceHeader eyebrow="Your care workspace" title="My consultations." description="Your records, review progress, and specialist opinions—all together.">
      <Link href="/patient/dashboard/new-consultation" id="new-consultation-btn" className="primary-link w-full sm:w-auto"><Plus className="size-4" aria-hidden />New consultation</Link>
    </WorkspaceHeader>
    {!loading && !error && <div className="grid sm:grid-cols-3 gap-4 mb-10">
      <MetricCard label="Total consultations" value={cases.length} note="Your second opinion requests" icon={FileText} />
      <MetricCard label="In progress" value={cases.filter(c => c.status !== "COMPLETED").length} note="Payment or specialist review" icon={Clock3} />
      <MetricCard label="Opinions received" value={cases.filter(c => c.status === "COMPLETED").length} note="Ready to read in your workspace" icon={CircleCheck} />
    </div>}
    <div className="flex items-center justify-between gap-3 mb-5"><h2 className="text-lg font-medium tracking-tight">Your care journey</h2><Button onClick={refresh} loading={loading} variant="secondary" className="w-auto min-h-10! py-2! px-3! text-xs!"><RefreshCw className="size-3.5" aria-hidden />Refresh</Button></div>
    {error && <div className="mb-5"><Alert>{error} Use Refresh to retry.</Alert></div>}
    {loading ? <WorkspaceLoading label="Loading consultations" /> : !error && <CaseList cases={cases} />}
  </div>;
}
function CaseList({ cases }: { cases: Case[] }) {
  if (!cases.length) return <Card className="text-center py-14 sm:py-16">
    <span className="icon-tile size-16! mb-6"><HeartPulse className="size-7" strokeWidth={1.5} aria-hidden /></span>
    <h3 className="text-2xl font-medium tracking-tight mb-3">Your next perspective starts here.</h3><p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">Share your reports and concerns with a verified specialist. Your consultation and written opinion will appear in this workspace.</p>
    <Link href="/patient/dashboard/new-consultation" className="primary-link mt-7">Start a consultation <ArrowRight className="size-4" aria-hidden /></Link>
  </Card>;
  return <ul className="space-y-5">{cases.map(item => {
    const verifiedPaid = item.paymentStatus === "PAID" && Boolean(item.paymentId && item.paidAt);
    const completed = item.status === "COMPLETED";
    const status = completed ? "Opinion ready" : item.status === "IN_REVIEW" ? item.doctorId ? "Specialist reviewing" : "Awaiting assignment" : "Payment needed";
    const progress = completed ? 3 : item.status === "IN_REVIEW" ? 2 : 1;
    return <li key={item.id} className="glass-panel rounded-3xl p-6 sm:p-7">
      <div className="flex flex-wrap justify-between gap-4 mb-5">
        <div className="flex items-center gap-3"><span className="icon-tile"><FileText className="size-5" aria-hidden /></span><div><h3 className="text-lg font-medium tracking-tight">{item.department}</h3><p className="font-mono text-[10px] text-zinc-500 mt-1">{displayCaseId(item.id)}</p></div></div>
        <span className={completed ? "status-pill self-start" : "status-pill self-start border-white/10! text-zinc-300! bg-white/3!"}>{completed && <CircleCheck className="size-3" aria-hidden />}{status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-6" aria-label="Consultation progress">
        {["Records submitted", "Paid & in review", "Opinion received"].map((label, i) => <div key={label}><div className={i < progress ? "h-1 rounded-full bg-brand-300/70 mb-2" : "h-1 rounded-full bg-white/10 mb-2"} /><p className={i < progress ? "text-[10px] text-zinc-300" : "text-[10px] text-zinc-500"}>{label}</p></div>)}
      </div>
      <p className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">{item.chiefComplaint}</p>
      <p className="text-xs text-zinc-500 mt-4">{verifiedPaid ? "Paid " : "Consultation fee "}{formatINR(item.amount)} · {toDate(item.createdAt)?.toLocaleDateString("en-IN") ?? "Date unavailable"}</p>
      {item.status === "IN_REVIEW" && <div className="rounded-xl border border-white/8 bg-zinc-950/35 p-4 mt-5"><p className="text-xs text-zinc-400 leading-relaxed">{item.doctorId
        ? "Your reports are assigned to " + (item.doctorName || "a verified specialist") + " in " + item.department + ". Their opinion will appear here when the review is complete."
        : "Your payment is confirmed. Your request is waiting for an available verified " + item.department + " specialist. Refresh to check assignment progress."}</p></div>}
      {item.status === "AWAITING_PAYMENT" && <Link href={"/patient/dashboard/payment?caseId=" + encodeURIComponent(item.id)} className="primary-link mt-5">Continue payment <ArrowRight className="size-4" aria-hidden /></Link>}
      <details className="rounded-xl border border-white/10 px-4 py-3 mt-5"><summary className="text-xs font-medium text-zinc-300">Your submitted reports ({item.files.length})</summary><div className="mt-4"><PrivateFileList files={item.files} /></div></details>
      {completed && <section aria-labelledby={"opinion-" + item.id} className="rounded-2xl bg-brand-300/5 border border-brand-300/20 p-5 sm:p-6 mt-5">
        <div className="flex items-center gap-2 text-brand-200"><CircleCheck className="size-4" aria-hidden /><h4 id={"opinion-" + item.id} className="font-medium">Your specialist’s opinion</h4></div>
        <p className="mt-2 text-xs text-zinc-400">{item.doctorName ?? "Verified specialist"}{item.completedAt ? " · " + toDate(item.completedAt)?.toLocaleDateString("en-IN") : ""}</p>
        <p className="mt-5 whitespace-pre-wrap break-words text-sm text-zinc-200 leading-relaxed">{item.opinion || "The opinion is unavailable. Please contact support."}</p>
      </section>}
    </li>;
  })}</ul>;
}
