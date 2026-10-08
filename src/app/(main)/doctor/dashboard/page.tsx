"use client";

import Link from "next/link";
import { MEDICAL_AI_AVAILABLE } from "@/lib/features";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, FileText, ShieldCheck, RefreshCw, Sparkles } from "lucide-react";
import { Alert, Card, Button, Field, Textarea } from "@/components/ui";
import { MetricCard, WorkspaceHeader, WorkspaceLoading } from "@/components/WorkspaceUI";
import { PrivateFileList } from "@/components/PrivateFileList";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getMyDoctorProfile } from "@/lib/data/doctors";
import { displayCaseId, listAssignedCases, completeCase } from "@/lib/data/cases";
import type { DoctorProfile, Case } from "@/lib/data/types";
import { errorMessage } from "@/lib/errors";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      try {
        const me = await getMyDoctorProfile(user.uid);
        const available = me?.status === "VERIFIED" ? await listAssignedCases(user.uid, me.specialization) : [];
        if (!cancelled) { setDoctor(me); setCases(available); }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Could not load your workspace."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [user, revision]);

  const refresh = () => { setLoading(true); setError(null); setRevision((value) => value + 1); };

  return <div className="page-shell workspace-shell"><div className="space-y-6">
    <WorkspaceHeader eyebrow="Specialist workspace" title="Your expertise, in focus." description={doctor ? doctor.fullName + " · " + doctor.specialization : "Review patient records and share a thoughtful second opinion."}>
      <Button onClick={refresh} loading={loading} variant="secondary" className="w-auto"><RefreshCw className="size-4" aria-hidden />Refresh workspace</Button>
    </WorkspaceHeader>
    {error && <Alert>{error} Use Refresh workspace to retry.</Alert>}
    {notice && <Alert tone="success">{notice}</Alert>}
    {loading ? <WorkspaceLoading label="Loading specialist workspace" /> : !error && <>
      {!doctor && <Card><h2 className="text-xl font-semibold text-white mb-3">Complete your application</h2><Link href="/doctor/onboarding" className="text-teal-300 underline">Continue doctor registration</Link></Card>}
      {doctor?.status === "PENDING" && <Card><h2 className="text-xl font-semibold text-white mb-3">Verification in progress</h2><p className="text-zinc-400">Your registration is awaiting review. Refresh this workspace to check its status.</p></Card>}
      {doctor?.status === "REJECTED" && <Card><h2 className="text-xl font-semibold text-white mb-3">Application needs attention</h2><p className="text-zinc-400">Your registration could not be verified. Contact support to request a review of your application.</p></Card>}
      {doctor?.status === "VERIFIED" && <>
        <div className="grid sm:grid-cols-3 gap-4"><MetricCard label="Awaiting your review" value={cases.length} note="Cases assigned to your expertise" icon={Clock3} /><MetricCard label="Your specialty" value={doctor.specialization} note="Assignment follows your specialty" icon={FileText} /><MetricCard label="Registration" value="Verified" note="Eligible to review consultations" icon={ShieldCheck} /></div><p className="status-pill w-fit"><CheckCircle2 className="size-3.5" aria-hidden /> Verified specialist</p>
        <h2 className="text-xl font-bold text-white">Your assigned patient cases</h2>
        <p className="text-sm text-zinc-400">Consultations matching your specialty are assigned to you after payment confirmation.</p>
        {!cases.length ? <Card className="text-center py-12"><span className="icon-tile mb-5"><FileText className="size-5" aria-hidden /></span><h3 className="text-xl font-medium mb-3">You’re all caught up.</h3><p className="text-sm text-zinc-400">New consultations in your specialty will appear here when assigned.</p></Card> : <div className="space-y-6">{cases.map((item) => <CaseReview key={item.id} item={item} doctor={doctor} onCompleted={() => {
          setCases((current) => current.filter((entry) => entry.id !== item.id));
          setNotice("Opinion submitted for " + displayCaseId(item.id) + ". The patient can now read it.");
        }} />)}</div>}
      </>}
    </>}
  </div></div>;
}

function CaseReview({ item, doctor, onCompleted }: { item: Case; doctor: DoctorProfile; onCompleted: () => void }) {
  const [opinion, setOpinion] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiData, setAiData] = useState<{ summary: string; flags: string[]; draftOpinion: string } | null>(null);
  const pending = useRef(false);

  const generateSummary = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chiefComplaint: item.chiefComplaint, medications: item.medications })
      });
      if (!res.ok) throw new Error("AI Summary failed");
      const data = await res.json();
      setAiData(data);
      if (!opinion) setOpinion(data.draftOpinion);
      setEditing(true);
    } catch {
      setError("Could not generate AI summary at this time.");
    } finally {
      setAnalyzing(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (!opinion.trim()) { setError("Enter your specialist opinion before submitting."); return; }
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await completeCase(doctor.uid, item.id, opinion);
      onCompleted();
    } catch (err) {
      setError(errorMessage(err, "Could not submit this opinion. Your draft is retained; please retry."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return <article className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
    <h3 className="text-lg font-medium tracking-tight text-white">Case {displayCaseId(item.id)}</h3>
    <div><h4 className="text-sm font-semibold text-zinc-400">Chief complaint</h4><p className="mt-1 whitespace-pre-wrap break-words text-zinc-200">{item.chiefComplaint}</p></div>
    <div><h4 className="text-sm font-semibold text-zinc-400">Current medications</h4><p className="mt-1 whitespace-pre-wrap break-words text-zinc-300">{item.medications || "None provided"}</p></div>
    
    {aiData && (
      <div className="bg-brand-950/30 border border-brand-900/50 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h4 className="text-sm font-semibold text-brand-300 flex items-center gap-2">AI review assistant</h4>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Unvalidated draft · Physician review required
          </span>
        </div>
        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{aiData.summary}</p>
        {aiData.flags.length > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-amber-400 mt-2 mb-1">Potential Red Flags:</h5>
            <ul className="list-disc list-inside text-xs text-amber-200/80">
              {aiData.flags.map((flag, idx) => <li key={idx}>{flag}</li>)}
            </ul>
          </div>
        )}
      </div>
    )}

    <details className="rounded-xl border border-zinc-800 p-4"><summary className="cursor-pointer text-sm font-semibold text-teal-300">View reports ({item.files.length})</summary><div className="mt-4"><PrivateFileList files={item.files} /></div></details>
    {editing ? <form onSubmit={submit} className="space-y-4">
      <Field id={"opinion-input-" + item.id} label="Your specialist opinion" hint="Review the reports and explain your findings and recommended next steps.">
        <Textarea id={"opinion-input-" + item.id} value={opinion} onChange={(event) => setOpinion(event.target.value)} rows={9} maxLength={20000} required disabled={saving} accent="teal" />
      </Field>
      <p className="text-sm text-zinc-400">Submitting completes this consultation and shares your opinion with the patient.</p>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-3"><Button type="submit" loading={saving} accent="teal" className="w-auto">Submit opinion</Button><Button type="button" disabled={saving} variant="secondary" className="w-auto" onClick={() => setEditing(false)}>Cancel</Button></div>
    </form> : (
      <div className="flex flex-wrap gap-3">
        <Button type="button" accent="teal" className="w-auto" onClick={() => setEditing(true)}>Provide opinion</Button>
        {MEDICAL_AI_AVAILABLE && <Button type="button" variant="secondary" className="w-auto border-brand-900/50 text-brand-300 hover:bg-brand-900/50" loading={analyzing} onClick={generateSummary}><Sparkles className="size-4" aria-hidden />Generate review draft</Button>}
      </div>
    )}
  </article>;
}
