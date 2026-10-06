"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert, Card, Button, Field, Textarea } from "@/components/ui";
import { PrivateFileList } from "@/components/PrivateFileList";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getMyDoctorProfile } from "@/lib/data/doctors";
import { displayCaseId, listOpenCasesForSpecialty, completeCase } from "@/lib/data/cases";
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
        const available = me?.status === "VERIFIED" ? await listOpenCasesForSpecialty(me.specialization) : [];
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

  return <div className="flex-1 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8"><div className="max-w-5xl mx-auto space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
      <div><h1 className="text-3xl font-bold text-white">Doctor Workspace</h1>{doctor && <p className="text-zinc-400 mt-1">{doctor.fullName} · {doctor.specialization}</p>}</div>
      <Button onClick={refresh} loading={loading} variant="secondary" className="w-auto">Refresh workspace</Button>
    </div>
    {error && <Alert>{error} Use Refresh workspace to retry.</Alert>}
    {notice && <Alert tone="success">{notice}</Alert>}
    {loading ? <p role="status" className="text-zinc-400">Loading workspace…</p> : !error && <>
      {!doctor && <Card><h2 className="text-xl font-semibold text-white mb-3">Complete your application</h2><Link href="/doctor/onboarding" className="text-teal-300 underline">Continue doctor registration</Link></Card>}
      {doctor?.status === "PENDING" && <Card><h2 className="text-xl font-semibold text-white mb-3">Verification in progress</h2><p className="text-zinc-400">Your registration is awaiting review. Refresh this workspace to check its status.</p></Card>}
      {doctor?.status === "REJECTED" && <Card><h2 className="text-xl font-semibold text-white mb-3">Application needs attention</h2><p className="text-zinc-400">Your registration could not be verified. Contact support to request a review of your application.</p></Card>}
      {doctor?.status === "VERIFIED" && <>
        <p className="flex items-center gap-2 text-teal-300"><CheckCircle2 className="size-4" aria-hidden /> Verified specialist</p>
        <h2 className="text-xl font-bold text-white">Available patient cases</h2>
        {!cases.length ? <Card><p className="text-zinc-400">No cases in your specialization are awaiting review.</p></Card> : <div className="space-y-6">{cases.map((item) => <CaseReview key={item.id} item={item} doctor={doctor} onCompleted={() => {
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
  const pending = useRef(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    if (!opinion.trim()) { setError("Enter your specialist opinion before submitting."); return; }
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      await completeCase(doctor.uid, doctor.fullName, item.id, opinion);
      onCompleted();
    } catch (err) {
      setError(errorMessage(err, "Could not submit this opinion. Your draft is retained; please retry."));
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return <article className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
    <h3 className="text-lg font-bold text-white">Case {displayCaseId(item.id)}</h3>
    <div><h4 className="text-sm font-semibold text-zinc-400">Chief complaint</h4><p className="mt-1 whitespace-pre-wrap break-words text-zinc-200">{item.chiefComplaint}</p></div>
    <div><h4 className="text-sm font-semibold text-zinc-400">Current medications</h4><p className="mt-1 whitespace-pre-wrap break-words text-zinc-300">{item.medications || "None provided"}</p></div>
    <details className="rounded-xl border border-zinc-800 p-4"><summary className="cursor-pointer text-sm font-semibold text-teal-300">View reports ({item.files.length})</summary><div className="mt-4"><PrivateFileList files={item.files} /></div></details>
    {editing ? <form onSubmit={submit} className="space-y-4">
      <Field id={"opinion-input-" + item.id} label="Your specialist opinion" hint="Review the reports and explain your findings and recommended next steps.">
        <Textarea id={"opinion-input-" + item.id} value={opinion} onChange={(event) => setOpinion(event.target.value)} rows={9} maxLength={20000} required disabled={saving} accent="teal" />
      </Field>
      <p className="text-sm text-zinc-400">Submitting completes this consultation and shares your opinion with the patient.</p>
      {error && <Alert>{error}</Alert>}
      <div className="flex gap-3"><Button type="submit" loading={saving} accent="teal" className="w-auto">Submit opinion</Button><Button type="button" disabled={saving} variant="secondary" className="w-auto" onClick={() => setEditing(false)}>Cancel</Button></div>
    </form> : <Button type="button" accent="teal" className="w-auto" onClick={() => setEditing(true)}>Provide opinion</Button>}
  </article>;
}
