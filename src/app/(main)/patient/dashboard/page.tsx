"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, FileText } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { PrivateFileList } from "@/components/PrivateFileList";
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
    listMyCases(user.uid).then((data) => {
      if (!cancelled) setCases(data);
    }).catch((err: unknown) => {
      if (!cancelled) setError(errorMessage(err, "Could not load your consultations."));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, revision]);

  const refresh = () => { setLoading(true); setError(null); setRevision((value) => value + 1); };

  return (
    <div className="flex-1 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h1 className="text-3xl font-bold text-white">My Consultations</h1><p className="text-zinc-400 mt-1">Track your requests and read your specialist&apos;s opinion.</p></div>
          <Link href="/patient/dashboard/new-consultation" id="new-consultation-btn" className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-full font-semibold"><Plus className="size-5" aria-hidden /> New Consultation</Link>
        </div>
        <Button onClick={refresh} loading={loading} variant="secondary" className="w-auto">Refresh consultations</Button>
        {error && <Alert>{error} Use Refresh consultations to retry.</Alert>}
        {loading ? <p role="status" className="text-zinc-400">Loading consultations…</p> : !error && <CaseList cases={cases} />}
      </div>
    </div>
  );
}

function CaseList({ cases }: { cases: Case[] }) {
  if (!cases.length) return <Card className="text-center py-16"><FileText className="size-10 text-zinc-500 mx-auto mb-4" aria-hidden /><h2 className="text-xl font-semibold text-white mb-2">No consultations yet</h2><p className="text-zinc-400">Upload your reports and get an opinion from a verified specialist.</p></Card>;
  return <ul className="space-y-6">{cases.map((item) => {
    const verifiedPaid = item.paymentStatus === "PAID" && Boolean(item.paymentId && item.paidAt);
    return <li key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{item.department} <span className="font-mono text-sm text-zinc-400">{displayCaseId(item.id)}</span></h2>
        <span className="text-sm text-teal-300">{item.status === "COMPLETED" ? "Completed" : item.status === "IN_REVIEW" ? "Awaiting specialist review" : "Awaiting payment"}</span>
      </div>
      <p className="text-zinc-300 whitespace-pre-wrap break-words">{item.chiefComplaint}</p>
      <p className="text-xs text-zinc-400">{verifiedPaid ? "Paid " : "Consultation fee "}{formatINR(item.amount)} · {toDate(item.createdAt)?.toLocaleDateString("en-IN") ?? "Date unavailable"}</p>
      {item.status === "AWAITING_PAYMENT" && <Link href={"/patient/dashboard/payment?caseId=" + encodeURIComponent(item.id)} className="inline-block text-brand-300 underline">Continue payment</Link>}
      <details className="rounded-xl border border-zinc-800 p-4"><summary className="cursor-pointer text-sm font-medium text-zinc-300">Your reports ({item.files.length})</summary><div className="mt-4"><PrivateFileList files={item.files} /></div></details>
      {item.status === "COMPLETED" && <section aria-labelledby={"opinion-" + item.id} className="rounded-xl bg-teal-500/5 border border-teal-500/20 p-5">
        <h3 id={"opinion-" + item.id} className="text-lg font-semibold text-teal-300">Specialist opinion</h3>
        <p className="mt-1 text-sm text-zinc-400">{item.doctorName ?? "Verified specialist"}{item.completedAt ? " · " + toDate(item.completedAt)?.toLocaleDateString("en-IN") : ""}</p>
        <p className="mt-4 whitespace-pre-wrap break-words text-zinc-200 leading-relaxed">{item.opinion || "The opinion is unavailable. Please contact support."}</p>
      </section>}
    </li>;
  })}</ul>;
}
