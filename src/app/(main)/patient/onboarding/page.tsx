"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, ArrowRight } from "lucide-react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { normalizeProfile, ProfileInputError, type ProfileField } from "@/lib/auth/profile-input";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createUserProfile } from "@/lib/data/users";
import { getMyDoctorProfile } from "@/lib/data/doctors";
import { homeFor } from "@/lib/auth/email-link";
import { AuthError, FullPageLoader } from "@/lib/auth/RequireAuth";

type FormState = {
  name: string;
  dob: string;
  place: string;
  phone: string;
};

const FIELD_OF: Record<keyof FormState, ProfileField> = { name: "fullName", dob: "dob", place: "place", phone: "phone" };
const INPUT_OF: Record<ProfileField, string> = { fullName: "pat-name", dob: "pat-dob", place: "pat-place", phone: "pat-phone" };

export default function PatientOnboarding() {
  const router = useRouter();
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  
  const [form, setForm] = useState<FormState>({ name: "", dob: "", place: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    if (!authLoading && !authError) {
      if (!user) {
        router.replace("/patient/login");
      } else if (profile) {
        router.replace(homeFor(profile.role));
      } else {
        void getMyDoctorProfile(user.uid).then((application) => {
          if (active && application) router.replace("/doctor/onboarding");
        }).catch(() => {
          if (active) setError("Could not check your existing application. Check your connection and retry saving.");
        });
      }
    }
    return () => { active = false; };
  }, [user, profile, authLoading, authError, router]);

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError(null);
    setFieldErrors((current) => ({ ...current, [FIELD_OF[key]]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || profile || authError || saving.current) return;
    saving.current = true;
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const normalized = normalizeProfile({ fullName: form.name, phone: form.phone, dob: form.dob, place: form.place }, true);
      await createUserProfile(user, {
        role: "patient",
        ...normalized,
      });
      // The auth listener will pick up the new profile and redirect
    } catch (err) {
      // Point at the control that is wrong instead of showing one banner for everything.
      if (err instanceof ProfileInputError) {
        setFieldErrors({ [err.field]: err.message });
        document.getElementById(INPUT_OF[err.field])?.focus();
      } else {
        setError(err instanceof Error ? err.message : "Your profile could not be saved. Please try again.");
      }
    } finally {
      saving.current = false;
      setLoading(false);
    }
  };

  if (authError) return <AuthError />;
  if (authLoading || !user || profile) return <FullPageLoader />;

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="icon-tile mb-5">
            <User className="size-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-medium tracking-[-.03em] text-white">Complete your profile</h1>
          <p className="text-sm text-zinc-400 leading-relaxed mt-2">A few details so your specialist knows who they are reviewing for.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}

          <Field id="pat-name" label="Full name" error={fieldErrors.fullName}>
            <Input id="pat-name" accent="brand" autoComplete="name" maxLength={120} invalid={!!fieldErrors.fullName} value={form.name} onChange={update("name")} placeholder="John Doe" required />
          </Field>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="pat-dob" label="Date of birth" error={fieldErrors.dob}>
              <Input id="pat-dob" accent="brand" type="date" min="1900-01-01" autoComplete="bday" invalid={!!fieldErrors.dob} value={form.dob} onChange={update("dob")} required />
            </Field>
            <Field id="pat-place" label="City / Place" error={fieldErrors.place}>
              <Input id="pat-place" accent="brand" autoComplete="address-level2" maxLength={120} invalid={!!fieldErrors.place} value={form.place} onChange={update("place")} placeholder="Mumbai" required />
            </Field>
          </div>

          <Field id="pat-phone" label="Mobile number" error={fieldErrors.phone}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <span className="text-sm">+91</span>
              </div>
              <Input id="pat-phone" accent="brand" type="tel" inputMode="numeric" invalid={!!fieldErrors.phone} value={form.phone} onChange={update("phone")} placeholder="98765 43210" className="pl-12" maxLength={14} required />
            </div>
          </Field>

          <Button type="submit" accent="brand" loading={loading} className="w-full mt-2">
            Save profile <ArrowRight className="size-4" aria-hidden />
          </Button>
        </form>
      </Card>
    </div>
  );
}
