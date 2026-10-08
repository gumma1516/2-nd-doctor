"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { FileDropzone, type UploadItem } from "@/components/FileDropzone";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { DOCTOR_UPLOAD, INDIAN_PHONE_REGEX, REG_NUMBER_REGEX, SPECIALTIES, type Specialty } from "@/lib/constants";
import { useAuth } from "@/lib/auth/AuthProvider";
import { submitDoctorApplication, recoverDoctorApplication } from "@/lib/data/doctors";
import { homeFor } from "@/lib/auth/email-link";
import { AuthError, FullPageLoader } from "@/lib/auth/RequireAuth";

type FormState = {
  fullName: string;
  phone: string;
  regNumber: string;
  council: string;
  specialization: string;
  experience: string;
};

type Errors = Partial<Record<keyof FormState | "files" | "declaration", string>>;

const INITIAL: FormState = {
  fullName: "",
  phone: "",
  regNumber: "",
  council: "",
  specialization: "",
  experience: "",
};

export default function DoctorOnboarding() {
  const router = useRouter();
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  
  const [form, setForm] = useState<FormState>(INITIAL);
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [declaration, setDeclaration] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [check, setCheck] = useState<{ uid: string; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const saving = useRef(false);

  useEffect(() => {
    if (authLoading || authError) return;
    if (!user) {
      router.replace("/doctor/login");
      return;
    }
    if (profile && (profile.role !== "doctor" || profile.status !== "active")) {
      router.replace(homeFor(profile.role));
      return;
    }
    let active = true;
    
    // Check if doctor profile already exists
    const checkStatus = async () => {
      try {
        const docProfile = await recoverDoctorApplication(user);
        if (!active) return;
        if (docProfile) {
          if (docProfile.status === "VERIFIED" || docProfile.status === "REJECTED") {
            router.replace("/doctor/dashboard");
          } else {
            setSubmitted(true);
          }
        }
        setCheck({ uid: user.uid, error: null });
      } catch (err) {
        if (active) setCheck({ uid: user.uid, error: err instanceof Error ? err.message : "Could not load your application. Please try again." });
      }
    };
    void checkStatus();
    return () => { active = false; };
  }, [user, profile, authLoading, authError, router, attempt]);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (form.fullName.trim().length < 3 || form.fullName.trim().length > 120) e.fullName = "Enter your full name (3-120 characters).";
    if (!INDIAN_PHONE_REGEX.test(form.phone.replace(/[\s-]/g, ""))) e.phone = "Enter a valid 10-digit mobile number.";
    if (!REG_NUMBER_REGEX.test(form.regNumber.trim())) e.regNumber = "Enter a valid registration number.";
    if (form.council.trim().length < 2 || form.council.trim().length > 120) e.council = "Enter the issuing medical council (2-120 characters).";
    if (!SPECIALTIES.includes(form.specialization as Specialty)) e.specialization = "Select your specialization.";
    const exp = Number(form.experience);
    if (!form.experience || !Number.isInteger(exp) || exp < 0 || exp > 60) e.experience = "Enter whole years of experience (0-60).";
    if (files.length === 0) e.files = "Upload your degree and registration certificate.";
    if (!declaration) e.declaration = "You must confirm the declaration.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || authError || saving.current || (profile && (profile.role !== "doctor" || profile.status !== "active"))) return;
    
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(`doc-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    
    saving.current = true;
    setLoading(true);
    try {
      const actualFiles = files.map(f => f.file);
      
      // Credentials and account profile are saved together after the upload completes.
      await submitDoctorApplication(user, {
        fullName: form.fullName.trim(),
        phone: form.phone.replace(/[\s-]/g, ""),
        regNumber: form.regNumber,
        council: form.council,
        specialization: form.specialization as Specialty,
        experience: Number(form.experience),
        files: actualFiles,
      });

      setSubmitted(true);
    } catch (err) {
      setErrors({ declaration: err instanceof Error ? err.message : "Failed to submit application. Please try again." });
    } finally {
      saving.current = false;
      setLoading(false);
    }
  };

  if (authError) return <AuthError />;
  if (authLoading || !user || (profile && profile.role !== "doctor") || check?.uid !== user.uid) return <FullPageLoader />;
  if (check.error) return <div className="flex-1 flex items-center justify-center px-4 py-24"><Card className="max-w-md space-y-4">
    <Alert>{check.error}</Alert>
    <Button onClick={() => { setCheck(null); setAttempt((value) => value + 1); }}>Try again</Button>
  </Card></div>;

  if (submitted) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full p-10 text-center">
          <div className="size-20 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(20,184,166,0.25)]">
            <CheckCircle2 className="size-10" aria-hidden />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white mb-3">Application Submitted</h1>
          <p className="text-zinc-400 mb-8">
            Thank you, {form.fullName ? form.fullName.split(" ").slice(0, 2).join(" ") : (profile?.fullName || "Doctor")}. Your credentials are awaiting administrator review.
            You can review assigned consultations after verification. Check your dashboard for the review outcome.
          </p>
          <Link href="/doctor/dashboard" id="doctor-register-home-link" className="text-teal-400 hover:text-teal-300 font-medium">
            View dashboard
          </Link>
        </Card>
      </div>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl w-full md:p-12">
        <div className="text-center mb-8">
          <div className="icon-tile mb-5">
            <ShieldAlert className="size-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-white">Apply as a Specialist</h1>
          <p className="text-sm text-zinc-400 mt-2">Join our network of verified medical experts.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {errorCount > 0 && <Alert>Please fix the highlighted fields.</Alert>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field id="doc-fullName" label="Full Name *" error={errors.fullName}>
              <Input id="doc-fullName" accent="teal" autoComplete="name" value={form.fullName} onChange={update("fullName")} invalid={!!errors.fullName} placeholder="Dr. Priya Mehta" />
            </Field>
            
            <Field id="doc-phone" label="Mobile Number *" error={errors.phone}>
              <Input id="doc-phone" accent="teal" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={update("phone")} invalid={!!errors.phone} placeholder="98765 43210" maxLength={14} />
            </Field>
            <Field id="doc-experience" label="Years of Experience *" error={errors.experience}>
              <Input id="doc-experience" accent="teal" type="number" min={0} max={60} value={form.experience} onChange={update("experience")} invalid={!!errors.experience} placeholder="10" />
            </Field>
            <Field id="doc-regNumber" label="Medical Registration No. *" error={errors.regNumber} hint="NMC or State Medical Council number">
              <Input id="doc-regNumber" accent="teal" value={form.regNumber} onChange={update("regNumber")} invalid={!!errors.regNumber} placeholder="e.g. 12345" />
            </Field>
            <Field id="doc-council" label="Issuing Council *" error={errors.council}>
              <Input id="doc-council" accent="teal" value={form.council} onChange={update("council")} invalid={!!errors.council} placeholder="e.g. Maharashtra Medical Council" />
            </Field>
            <Field id="doc-specialization" label="Specialization *" error={errors.specialization} className="md:col-span-2">
              <Select id="doc-specialization" accent="teal" value={form.specialization} onChange={update("specialization")} invalid={!!errors.specialization}>
                <option value="" disabled>
                  Select your specialization
                </option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="md:col-span-2">
              <p className="block text-sm font-medium text-zinc-300 mb-1">Credential Documents *</p>
              <FileDropzone
                id="doc-files"
                accent="teal"
                items={files}
                onChange={(items) => {
                  setFiles(items);
                  if (items.length) setErrors((p) => ({ ...p, files: undefined }));
                }}
                limits={DOCTOR_UPLOAD}
                title="Upload documents"
                helper="MBBS / MD / MS degree certificates and medical council registration certificate."
                error={errors.files}
              />
            </div>
          </div>

          <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="text-white font-semibold">Oath-Gated Access & Ethical Principles</h3>
            <p className="text-sm text-zinc-400">Before joining SecondCare as a clinical decision-maker, you must commit to the following principles:</p>
            <label className="flex items-start gap-3 cursor-pointer mt-2">
              <input
                id="doc-declaration"
                type="checkbox"
                checked={declaration}
                onChange={(e) => {
                  setDeclaration(e.target.checked);
                  if (e.target.checked) setErrors((p) => ({ ...p, declaration: undefined }));
                }}
                className="mt-1 size-4 accent-teal-500 shrink-0"
              />
              <span className="text-sm text-zinc-300 leading-relaxed">
                <strong>Do No Harm & Pursuit of Truth:</strong> I will prioritize human safety, strive for accuracy, and acknowledge the limits of AI-assisted decision support.<br/>
                <span className="block mt-2"><strong>Data Sanctity & Human Agency:</strong> I will guard patient confidentiality and ensure that I remain the ultimate arbiter of truth, using AI as a tool, not a replacement for my clinical judgment.</span>
                <span className="block mt-2 text-zinc-400">I declare that my information is true, I hold a valid medical registration, and I agree to the <Link href="/terms" target="_blank" className="text-teal-400 hover:underline">Terms of Service</Link>.</span>
              </span>
            </label>
            {errors.declaration && (
              <p role="alert" className="mt-2 text-xs text-red-400 pl-7">
                {errors.declaration}
              </p>
            )}
          </div>

          <Button id="doctor-submit-verification-btn" type="submit" accent="teal" loading={loading} className="py-4 text-lg">
            Submit for Verification
          </Button>

        </form>
      </Card>
    </div>
  );
}
