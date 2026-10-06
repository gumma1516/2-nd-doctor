"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, ArrowRight } from "lucide-react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { INDIAN_PHONE_REGEX } from "@/lib/constants";
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

export default function PatientOnboarding() {
  const router = useRouter();
  const { user, profile, loading: authLoading, error: authError } = useAuth();
  
  const [form, setForm] = useState<FormState>({ name: "", dob: "", place: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || profile || authError) return;
    
    if (form.name.trim().length < 3) return setError("Enter a valid name.");
    if (!form.dob) return setError("Enter your date of birth.");
    if (!Number.isFinite(Date.parse(form.dob)) || new Date(form.dob).getTime() > Date.now()) return setError("Enter a valid date of birth in the past.");
    if (form.place.trim().length < 2) return setError("Enter your city/place.");
    
    const normalized = form.phone.replace(/[\s-]/g, "");
    if (!INDIAN_PHONE_REGEX.test(normalized)) {
      return setError("Enter a valid 10-digit Indian mobile number.");
    }

    setLoading(true);
    try {
      await createUserProfile(user, {
        role: "patient",
        fullName: form.name.trim(),
        phone: normalized,
        dob: form.dob,
        place: form.place,
      });
      // The auth listener will pick up the new profile and redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authError) return <AuthError />;
  if (authLoading || !user || profile) return <FullPageLoader />;

  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-12 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-4 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <User className="size-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-white">Complete Your Profile</h1>
          <p className="text-sm text-zinc-400 mt-2">Just a few more details to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <Alert>{error}</Alert>}

          <Field id="pat-name" label="Full Name">
            <Input id="pat-name" accent="brand" value={form.name} onChange={update("name")} placeholder="John Doe" required />
          </Field>
          
          <div className="grid grid-cols-2 gap-4">
            <Field id="pat-dob" label="Date of Birth">
              <Input id="pat-dob" accent="brand" type="date" value={form.dob} onChange={update("dob")} required />
            </Field>
            <Field id="pat-place" label="City / Place">
              <Input id="pat-place" accent="brand" value={form.place} onChange={update("place")} placeholder="Mumbai" required />
            </Field>
          </div>

          <Field id="pat-phone" label="Mobile Number">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <span className="text-sm">+91</span>
              </div>
              <Input id="pat-phone" accent="brand" type="tel" inputMode="numeric" value={form.phone} onChange={update("phone")} placeholder="98765 43210" className="pl-12" maxLength={14} required />
            </div>
          </Field>

          <Button type="submit" accent="brand" loading={loading} className="w-full mt-2">
            Save Profile <ArrowRight className="size-4" aria-hidden />
          </Button>
        </form>
      </Card>
    </div>
  );
}
