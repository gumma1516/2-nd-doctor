"use client";

import Link from "next/link";
import { MEDICAL_AI_AVAILABLE } from "@/lib/features";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { FileDropzone, type UploadItem } from "@/components/FileDropzone";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import { PATIENT_UPLOAD, SPECIALTIES, type Specialty } from "@/lib/constants";
import { draftStore, type SavedDraft } from "@/lib/draft-store";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { WorkspaceHeader } from "@/components/WorkspaceUI";
import { ConsultationSteps } from "@/components/ConsultationSteps";
import { ClientOnly } from "@/components/ClientOnly";
import { getMyCase } from "@/lib/data/cases";

type Errors = Partial<Record<"department" | "files" | "chiefComplaint" | "consent", string>>;

export default function NewConsultation() {
  return (
    <ClientOnly fallback={<div className="flex-1 bg-zinc-950" />}>
      <ConsultationForm />
    </ClientOnly>
  );
}

function ConsultationForm() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<{ uid: string; value: SavedDraft | null; submitted: boolean } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    let active = true;
    draftStore.get(user.uid).then(async (value) => {
      const submitted = value ? !!(await getMyCase(user.uid, value.draft.id)) : false;
      if (active) setSaved({ uid: user.uid, value, submitted });
    })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Unable to restore your draft."); });
    return () => { active = false; };
  }, [user]);
  if (error) return <div className="max-w-xl mx-auto p-8"><Alert>{error}</Alert><p className="text-zinc-400 mt-4">Enable browser storage, then reload this page.</p></div>;
  if (!user || saved?.uid !== user.uid) return <div className="p-8 text-zinc-400" role="status">Loading your consultation…</div>;
  if (saved.submitted && saved.value) return <div className="max-w-xl mx-auto p-8">
    <h1 className="text-2xl font-bold text-white mb-4">Your consultation has been saved</h1>
    <p className="text-zinc-400 mb-6">Resume its payment from your dashboard. Submitted details and reports are kept together so the specialist receives the records you checked out with.</p>
    <Link className="text-brand-400 hover:underline" href={`/patient/dashboard/payment?caseId=${encodeURIComponent(saved.value.draft.id)}`}>Resume saved consultation</Link>
    <Button className="mt-6" onClick={async () => {
      try {
        await draftStore.clear(user.uid, saved.value!.draft.id);
        setSaved({ uid: user.uid, value: null, submitted: false });
      } catch (err) { setError(err instanceof Error ? err.message : "Unable to start a new draft."); }
    }}>Start a separate consultation</Button>
  </div>;
  return <EditableConsultation key={`${user.uid}:${saved.value?.draft.id ?? "new"}`} uid={user.uid} initial={saved.value} />;
}

function EditableConsultation({ uid, initial }: { uid: string; initial: SavedDraft | null }) {
  const router = useRouter();
  const [draftId] = useState(() => initial?.draft.id ?? crypto.randomUUID());
  const [department, setDepartment] = useState<Specialty | "">(initial?.draft.department ?? "");
  const [files, setFiles] = useState<UploadItem[]>(() =>
    (initial?.files ?? []).map((file) => ({ id: crypto.randomUUID(), file }))
  );
  const [chiefComplaint, setChiefComplaint] = useState(initial?.draft.chiefComplaint ?? "");
  const [medications, setMedications] = useState(initial?.draft.medications ?? "");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [aiNotice, setAiNotice] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const suggestSpecialty = async () => {
    if (chiefComplaint.trim().length < 20) {
      setAiNotice({ message: "Please enter your chief complaint below first.", type: "error" });
      document.getElementById("consult-chiefComplaint")?.focus();
      return;
    }
    setAnalyzing(true);
    setAiNotice(null);
    try {
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chiefComplaint, medications })
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setDepartment(data.department);
      setErrors((p) => ({ ...p, department: undefined }));
      setAiNotice({ message: `AI Suggested ${data.department}: ${data.reasoning}`, type: "success" });
    } catch {
      setAiNotice({ message: "Could not auto-suggest a specialty at this time. Please select manually.", type: "error" });
    } finally {
      setAnalyzing(false);
    }
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!department) e.department = "Please select a department.";
    if (files.length === 0) e.files = "Upload at least one medical report.";
    if (chiefComplaint.trim().length < 20 || chiefComplaint.length > 2000)
      e.chiefComplaint = "Please describe your concern in at least 20 characters.";
    if (!consent) e.consent = "You must consent to share your records with a specialist.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`consult-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setSubmitting(true);
    setSaveError("");
    try {
    await draftStore.save(
      uid,
      {
        id: draftId,
        department: department as Specialty,
        chiefComplaint: chiefComplaint.trim(),
        medications: medications.trim(),
        fileNames: files.map((f) => f.file.name),
        consentAt: new Date().toISOString(),
      },
      files.map((f) => f.file)
    );
    router.push("/patient/dashboard/payment");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Your draft could not be saved. Please try again.");
      setSubmitting(false);
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <div className="page-shell workspace-shell max-w-[1040px]">
      <WorkspaceHeader eyebrow="A second perspective" title="Tell us your story." description="Choose your specialty and share the records you want your specialist to review." back={{href:"/patient/dashboard",label:"My consultations"}} />
      <ConsultationSteps current="details" />
      <div className="w-full pb-8">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="glass-panel rounded-3xl p-6 sm:p-9"
        >
          {saveError && <div className="mb-6"><Alert>{saveError}</Alert></div>}
          {errorCount > 0 && (
            <div className="mb-6">
              <Alert>Please fix {errorCount === 1 ? "1 issue" : `${errorCount} issues`} below before continuing.</Alert>
            </div>
          )}

          {/* 1. Department */}
          <fieldset className="mb-10">
            <legend id="specialty-legend" className="text-xl font-medium tracking-tight text-white mb-4">1. Choose your specialty</legend>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 mb-6 gap-3">
              <p className="text-xs text-zinc-400">Choose the field that fits your concern.</p>
              {MEDICAL_AI_AVAILABLE && <Button type="button" variant="secondary" className="w-auto text-xs! min-h-10! px-3!" loading={analyzing} onClick={suggestSpecialty}>
                <Sparkles className="size-3.5" aria-hidden />Suggest a specialty
              </Button>}
            </div>
            {aiNotice && <div className="mb-6"><Alert tone={aiNotice.type === "success" ? "success" : "info"}>{aiNotice.message}</Alert></div>}
            <div
              id="consult-department"
              tabIndex={-1}
              role="radiogroup"
              aria-labelledby="specialty-legend"
              aria-invalid={!!errors.department || undefined}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 focus:outline-none"
            >
              {SPECIALTIES.map((dept) => (
                <label key={dept} className="cursor-pointer">
                  <input
                    type="radio"
                    name="department"
                    value={dept}
                    checked={department === dept}
                    onChange={() => {
                      setDepartment(dept);
                      setErrors((p) => ({ ...p, department: undefined }));
                    }}
                    className="peer sr-only"
                  />
                  <div
                    className={cn(
                      "rounded-xl border bg-zinc-950 p-4 text-center hover:border-zinc-700 text-zinc-300 transition-colors peer-checked:border-brand-500 peer-checked:bg-brand-500/10 peer-checked:text-brand-400 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500",
                      errors.department ? "border-red-500/40" : "border-zinc-800"
                    )}
                  >
                    <span className="font-medium text-xs sm:text-sm">{dept}</span>
                  </div>
                </label>
              ))}
            </div>
            {errors.department && (
              <p role="alert" className="mt-2 text-xs text-red-400">
                {errors.department}
              </p>
            )}
          </fieldset>

          {/* 2. Reports */}
          <section className="mb-10" aria-labelledby="reports-heading">
            <h2 id="reports-heading" className="text-xl font-semibold text-white border-b border-zinc-800 pb-4 mb-6">
              2. Add your medical records
            </h2>
            <FileDropzone
              id="consult-files"
              items={files}
              onChange={(items) => {
                setFiles(items);
                if (items.length) setErrors((p) => ({ ...p, files: undefined }));
              }}
              limits={PATIENT_UPLOAD}
              helper="Prescriptions, MRI/CT scans, blood reports, ECG, biopsy reports, discharge summaries, etc."
              error={errors.files}
            />
          </section>

          {/* 3. History */}
          <section className="mb-10" aria-labelledby="history-heading">
            <h2 id="history-heading" className="text-xl font-semibold text-white border-b border-zinc-800 pb-4 mb-6">
              3. Share your medical history
            </h2>
            <div className="space-y-4">
              <Field
                id="consult-chiefComplaint"
                label="Chief Complaint *"
                error={errors.chiefComplaint}
                hint={`${chiefComplaint.trim().length}/2000 characters`}
              >
                <Textarea
                  id="consult-chiefComplaint"
                  rows={4}
                  maxLength={2000}
                  value={chiefComplaint}
                  invalid={!!errors.chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Describe your main symptoms, current diagnosis, and why you are seeking a second opinion..."
                />
              </Field>
              <Field id="consult-medications" label="Current Medications (optional)">
                <Textarea
                  id="consult-medications"
                  rows={2}
                  maxLength={1000}
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="List any medicines you are currently taking, with dosage if known..."
                />
              </Field>
            </div>
          </section>

          {/* Consent */}
          <div className="mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                id="consult-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (e.target.checked) setErrors((p) => ({ ...p, consent: undefined }));
                }}
                aria-invalid={!!errors.consent || undefined}
                className="mt-1 size-4 rounded border-zinc-700 bg-zinc-950 accent-brand-500"
              />
              <span className="text-sm text-zinc-400">
                I consent to SecondCare sharing my medical records with the assigned verified specialist for the purpose
                of a second opinion, as described in the{" "}
                <Link href="/privacy" target="_blank" className="text-brand-400 hover:underline">
                  Privacy Policy
                </Link>
                . I understand this is not a substitute for emergency care.
              </span>
            </label>
            {errors.consent && (
              <p role="alert" className="mt-2 text-xs text-red-400 pl-7">
                {errors.consent}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-6 border-t border-zinc-800">
            <Button
              id="proceed-to-payment-btn"
              type="submit"
              loading={submitting}
              className="w-full sm:w-auto px-7!"
            >
              Continue to payment <ArrowRight className="size-5" aria-hidden />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
