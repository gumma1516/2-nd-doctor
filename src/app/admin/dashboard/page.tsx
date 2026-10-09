"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Activity, Users, Stethoscope, FileText, IndianRupee } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { WorkspaceLoading } from "@/components/WorkspaceUI";
import { Alert, Button } from "@/components/ui";
import { PrivateFileList } from "@/components/PrivateFileList";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AccountNav } from "@/lib/auth/AccountNav";
import { adminListUsers, adminSetUserStatus } from "@/lib/data/users";
import { adminListDoctors, adminSetDoctorStatus } from "@/lib/data/doctors";
import { adminListCases, displayCaseId } from "@/lib/data/cases";
import { toDate, type UserProfile, type DoctorProfile, type DoctorStatus, type Case } from "@/lib/data/types";
import { formatINR, type Specialty } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";

const TABS = [
  { id: "overview", label: "Overview", Icon: Activity },
  { id: "patients", label: "Patients", Icon: Users },
  { id: "doctors", label: "Doctors", Icon: Stethoscope },
  { id: "cases", label: "Cases", Icon: FileText },
  { id: "revenue", label: "Revenue", Icon: IndianRupee },
] as const;
type TabId = (typeof TABS)[number]["id"];
const verifiedPayment = (item: Case) => item.paymentStatus === "PAID" && Boolean(item.paymentId && item.paymentOrderId && item.paidAt);
const panel = "glass-panel rounded-3xl p-6";

export default function AdminDashboard() {
  const { profile, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [doctorAccounts, setDoctorAccounts] = useState<UserProfile[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [assignmentCursor, setAssignmentCursor] = useState<string | null>(null);
  const reviewing = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminListUsers(), adminListDoctors(), adminListCases()]).then(([users, applications, consultations]) => {
      if (!cancelled) {
        setPatients(users.filter((user) => user.role === "patient"));
        setDoctorAccounts(users.filter((user) => user.role === "doctor"));
        setDoctors(applications);
        setCases(consultations);
      }
    }).catch((err: unknown) => {
      if (!cancelled) setError(errorMessage(err, "Could not load admin data."));
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [revision]);

  const refresh = () => { setLoading(true); setError(null); setRevision((value) => value + 1); };
  const assignBatch = async (specialization?: Specialty, afterCaseId?: string | null) => {
    const token = await getToken();
    if (!token) throw new Error("Sign in again to assign consultations.");
    const response = await fetch("/api/admin/assign-cases", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ limit: 50, ...(specialization ? { specialization } : {}), ...(afterCaseId ? { afterCaseId } : {}) }),
    });
    const result = await response.json() as { error?: string; assigned: number; waiting: number; nextCursor: string | null };
    if (!response.ok) throw new Error(result.error || "Could not assign consultations. Please retry.");
    if (!specialization) setAssignmentCursor(result.nextCursor);
    return result;
  };
  const retryAssignments = async () => {
    if (reviewing.current) return;
    reviewing.current = true; setSavingUid("assignments"); setActionError(null); setNotice(null);
    try {
      const result = await assignBatch(undefined, assignmentCursor);
      setNotice(`${result.assigned} consultations assigned. ${result.waiting} awaiting an available verified specialist.${result.nextCursor ? " Continue with the next batch." : " Assignment check complete."}`);
      refresh();
    } catch (err) { setActionError(errorMessage(err, "Could not assign consultations. Please retry.")); }
    finally { reviewing.current = false; setSavingUid(null); }
  };
  const changeAccountStatus = async (account: UserProfile) => {
    if (reviewing.current) return;
    reviewing.current = true; setSavingUid(account.uid); setActionError(null); setNotice(null);
    const status = account.status === "active" ? "disabled" : "active";
    try {
      await adminSetUserStatus(account.uid, status);
      const update = (items: UserProfile[]) => items.map((item) => item.uid === account.uid ? { ...item, status: status as "active" | "disabled" } : item);
      setPatients(update); setDoctorAccounts(update);
      setNotice(`${account.fullName}'s account is now ${status}.`);
      if (account.role === "doctor") {
        try { await assignBatch(); refresh(); }
        catch (err) { setActionError(`Account status saved. ${errorMessage(err, "Use Retry automatic assignment to update the consultation queue.")}`); }
      }
    } catch (err) { setActionError(errorMessage(err, "Could not change account status.")); }
    finally { reviewing.current = false; setSavingUid(null); }
  };
  const review = async (doctor: DoctorProfile, status: DoctorStatus) => {
    if (reviewing.current) return;
    reviewing.current = true;
    setSavingUid(doctor.uid);
    setActionError(null);
    setNotice(null);
    try {
      await adminSetDoctorStatus(doctor.uid, status);
      setDoctors((current) => current.map((item) => item.uid === doctor.uid ? { ...item, status } : item));
      setNotice(doctor.fullName + (status === "VERIFIED" ? " has been verified." : " has been rejected."));
      try {
        const result = await assignBatch(doctor.specialization);
        setNotice(`${doctor.fullName} ${status === "VERIFIED" ? "has been verified" : "has been rejected"}. ${result.assigned} consultations assigned.${result.nextCursor ? " Use Retry automatic assignment to process the remaining queue." : ""}`);
        refresh();
      } catch (err) { setActionError(`Doctor review saved. ${errorMessage(err, "Use Retry automatic assignment to update the consultation queue.")}`); }
    } catch (err) {
      setActionError(errorMessage(err, "Could not save the review. Please retry."));
    } finally {
      reviewing.current = false;
      setSavingUid(null);
    }
  };
  const paidCases = cases.filter(verifiedPayment);
  const revenue = paidCases.reduce((sum, item) => sum + item.amount, 0);
  const pending = doctors.filter((doctor) => doctor.status === "PENDING");
  const patientName = (uid: string) => patients.find((patient) => patient.uid === uid)?.fullName || uid;

  return <div className="min-h-screen text-zinc-300 lg:flex">
    <aside className="site-header border-b lg:border-b-0 lg:border-r border-white/8 lg:w-64 lg:shrink-0 bg-zinc-950/60 backdrop-blur-xl p-5">
      <div className="px-3 py-5"><BrandLogo /><p className="eyebrow mt-5">Administration</p></div>
      <nav aria-label="Admin" className="flex overflow-x-auto gap-2 lg:flex-col lg:mt-5">{TABS.map(({ id, label, Icon }) => <button key={id} type="button" aria-current={activeTab === id ? "page" : undefined} onClick={() => setActiveTab(id)} className={"flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-left font-medium " + (activeTab === id ? "bg-brand-500/10 text-brand-300" : "hover:bg-zinc-800 text-zinc-400")}><Icon className="size-5" aria-hidden />{label}</button>)}</nav>
      <Link href="/" className="inline-block p-4 text-sm text-zinc-400 hover:text-white">Back to site</Link>
      <div className="px-4 py-2"><AccountNav alwaysShowSignOut /></div>
    </aside>
    <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10 space-y-6 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6"><div><h1 className="text-3xl font-medium tracking-tight text-white">{TABS.find((tab) => tab.id === activeTab)?.label}</h1><p className="mt-1 text-sm text-zinc-400">{profile?.fullName || "Administrator"}</p></div><Button variant="secondary" loading={loading} disabled={Boolean(savingUid)} onClick={refresh} className="w-auto">Refresh data</Button></header>
      {error && <Alert>{error} Use Refresh data to retry.</Alert>}
      {actionError && <Alert>{actionError}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {loading ? <WorkspaceLoading label="Loading administrator workspace" /> : !error && <>
        {activeTab === "overview" && <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Patients" value={String(patients.length)} detail="Registered patient accounts" />
            <Stat label="Verified doctors" value={String(doctors.filter((doctor) => doctor.status === "VERIFIED").length)} detail={pending.length + " awaiting review"} />
            <Stat label="Cases in review" value={String(cases.filter((item) => item.status === "IN_REVIEW").length)} detail={cases.length + " total consultations"} />
            <Stat label="Verified revenue" value={formatINR(revenue)} detail={paidCases.length + " verified payments"} />
          </div>
          <section className={panel}><h2 className="text-xl font-semibold text-white mb-4">Recent consultations</h2><CaseRows cases={cases.slice(0, 5)} patientName={patientName} /></section>
          <section className={panel}><h2 className="text-xl font-semibold text-white mb-3">Doctor approvals</h2><p>{pending.length ? pending.length + " applications need a credential review." : "No applications are awaiting review."}</p><Button variant="secondary" className="mt-4 w-auto" onClick={() => setActiveTab("doctors")}>Review doctors</Button></section>
        </>}
        {activeTab === "patients" && <section className={panel}><h2 className="text-xl font-semibold text-white mb-4">Registered patients</h2>{!patients.length ? <p>No patients yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-zinc-400"><tr><th scope="col" className="p-3">Name</th><th scope="col" className="p-3">Email</th><th scope="col" className="p-3">Phone</th><th scope="col" className="p-3">Status</th><th scope="col" className="p-3">Joined</th><th scope="col" className="p-3">Manage account</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.uid} className="border-t border-zinc-800"><td className="p-3 text-white">{patient.fullName}</td><td className="p-3">{patient.email}</td><td className="p-3">{patient.phone}</td><td className="p-3">{patient.status}</td><td className="p-3">{toDate(patient.createdAt)?.toLocaleDateString("en-IN") ?? "—"}</td><td className="p-3"><Button variant="secondary" className="w-auto" loading={savingUid === patient.uid} disabled={Boolean(savingUid)} onClick={() => void changeAccountStatus(patient)}>{patient.status === "active" ? "Disable" : "Reactivate"}</Button></td></tr>)}</tbody></table></div>}</section>}
        {activeTab === "doctors" && <section className="space-y-4"><h2 className="text-xl font-semibold text-white">Applications and verified doctors</h2>{!doctors.length ? <p>No doctor applications yet.</p> : doctors.map((doctor) => <article key={doctor.uid} className={panel + " space-y-4"}>
          <div className="flex flex-wrap justify-between gap-3"><div><h3 className="text-lg font-semibold text-white">{doctor.fullName}</h3><p className="text-sm text-zinc-400">{doctor.specialization} · {doctor.experience} years of experience</p></div><span className="text-sm text-teal-300">{doctor.status}</span></div>
          <dl className="grid sm:grid-cols-2 gap-3 text-sm"><div><dt className="text-zinc-500">Registration</dt><dd>{doctor.regNumber} · {doctor.council}</dd></div><div><dt className="text-zinc-500">Contact</dt><dd>{doctor.email} · {doctorAccounts.find((account) => account.uid === doctor.uid)?.phone ?? doctor.phone}</dd></div><div><dt className="text-zinc-500">Account status</dt><dd>{doctorAccounts.find((account) => account.uid === doctor.uid)?.status ?? "Account recovery required"}</dd></div></dl>
          <details className="rounded-xl border border-zinc-800 p-4"><summary className="cursor-pointer font-medium text-brand-300">Review credentials ({doctor.files.length})</summary><div className="mt-4"><PrivateFileList files={doctor.files} /></div></details>
          <div className="flex flex-wrap gap-3"><Button accent="teal" className="w-auto" disabled={Boolean(savingUid)} loading={savingUid === doctor.uid} onClick={() => void review(doctor, "VERIFIED")}>{doctor.status === "VERIFIED" ? "Reconfirm verification" : `Verify ${doctor.fullName}`}</Button>{doctor.status !== "REJECTED" && <Button variant="secondary" className="w-auto" disabled={Boolean(savingUid)} onClick={() => void review(doctor, "REJECTED")}>{doctor.status === "VERIFIED" ? "Revoke verification" : "Reject application"}</Button>}{doctorAccounts.filter((account) => account.uid === doctor.uid).map((account) => <Button key={account.uid} variant="secondary" className="w-auto" disabled={Boolean(savingUid)} onClick={() => void changeAccountStatus(account)}>{account.status === "active" ? "Disable account" : "Reactivate account"}</Button>)}</div>
        </article>)}</section>}
        {activeTab === "cases" && <section className={panel}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold text-white">All consultations</h2><Button variant="secondary" className="w-auto" disabled={Boolean(savingUid)} loading={savingUid === "assignments"} onClick={() => void retryAssignments()}>{assignmentCursor ? "Continue automatic assignment" : "Retry automatic assignment"}</Button></div><CaseRows cases={cases} patientName={patientName} detailed /></section>}
        {activeTab === "revenue" && <section className={panel + " space-y-5"}><h2 className="text-xl font-semibold text-white">Verified payment revenue</h2><p className="text-3xl font-bold text-teal-300">{formatINR(revenue)}</p><p className="text-sm text-zinc-400">Only payments verified by the payment service are included. Pending and legacy unverified records are excluded.</p>{!paidCases.length ? <p>No verified payments yet.</p> : <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-zinc-400"><tr><th scope="col" className="p-3">Case</th><th scope="col" className="p-3">Payment reference</th><th scope="col" className="p-3">Paid on</th><th scope="col" className="p-3">Amount</th></tr></thead><tbody>{paidCases.map((item) => <tr key={item.id} className="border-t border-zinc-800"><td className="p-3">{displayCaseId(item.id)}</td><td className="p-3 break-all">{item.paymentId}</td><td className="p-3">{toDate(item.paidAt)?.toLocaleString("en-IN")}</td><td className="p-3">{formatINR(item.amount)}</td></tr>)}</tbody></table></div>}</section>}
      </>}
    </main>
  </div>;
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className={panel}><h2 className="text-sm text-zinc-400">{label}</h2><p className="text-3xl font-bold text-white mt-3">{value}</p><p className="text-xs text-zinc-400 mt-3">{detail}</p></div>;
}

function CaseRows({ cases, patientName, detailed = false }: { cases: Case[]; patientName: (uid: string) => string; detailed?: boolean }) {
  if (!cases.length) return <p>No consultations yet.</p>;
  return <ul className="space-y-4">{cases.map((item) => <li key={item.id} className="border border-zinc-800 rounded-xl p-4 space-y-3">
    <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold text-white">{displayCaseId(item.id)} · {item.department}</h3><span className="text-sm text-teal-300">{item.status.replaceAll("_", " ")}</span></div>
    <p className="text-sm text-zinc-400">Patient: {patientName(item.ownerId)} · {toDate(item.createdAt)?.toLocaleDateString("en-IN") ?? "Date unavailable"}</p>
    <p className="text-sm text-zinc-400">Assigned specialist: {item.doctorName || (verifiedPayment(item) ? "Awaiting an available verified specialist" : "Assigned after payment")}</p>
    <p className="text-xs text-zinc-500">{verifiedPayment(item) ? "Verified payment: " + formatINR(item.amount) : "Payment not verified"}</p>
    {detailed && <details><summary className="cursor-pointer text-sm text-brand-300">Consultation details</summary><div className="mt-4 space-y-4"><p className="whitespace-pre-wrap break-words">{item.chiefComplaint}</p><p className="whitespace-pre-wrap break-words text-sm text-zinc-400">Medications: {item.medications || "None provided"}</p><PrivateFileList files={item.files} />{item.opinion && <div><h4 className="font-semibold text-teal-300">Opinion from {item.doctorName}</h4><p className="whitespace-pre-wrap break-words mt-2">{item.opinion}</p></div>}</div></details>}
  </li>)}</ul>;
}
