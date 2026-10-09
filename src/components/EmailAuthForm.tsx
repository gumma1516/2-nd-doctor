"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, ArrowLeft, ShieldCheck, Stethoscope, FileText, LockKeyhole } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile, logAudit, touchLastLogin } from "@/lib/data/users";
import { errorMessage } from "@/lib/errors";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { EMAIL_REGEX, sendLoginLink, RESEND_SECONDS, homeFor } from "@/lib/auth/email-link";
import { rememberSpecialty, specialtyFromSearch } from "@/lib/specialty-intent";

type Props = {
  mode: "login" | "register";
  role: "patient" | "doctor";
};

export function EmailAuthForm({ mode, role }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);
  const [remember, setRemember] = useState(true);
  const working = useRef(false);

  const accent = role === "doctor" ? "teal" : "brand";
  const isLogin = mode === "login";
  const roleLabel = role === "doctor" ? "Doctor" : "Patient";

  // Read from the location rather than useSearchParams so these routes stay static.
  useEffect(() => {
    if (role === "patient") rememberSpecialty(specialtyFromSearch(window.location.search));
  }, [role]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (working.current || cooldown > 0) return;
    setError(null);
    setEmailError(undefined);
    
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      document.getElementById(role + "-" + mode + "-email")?.focus();
      return;
    }
    
    working.current = true;
    setPending("email");
    try {
      await sendLoginLink(email.trim(), { role, remember });
      setStep("sent");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(errorMessage(err, "Could not send a sign-in link. Please try again."));
    } finally {
      working.current = false;
      setPending(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (working.current) return;
    working.current = true;
    setError(null);
    setPending("google");
    try {
      const provider = new GoogleAuthProvider();
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const result = await signInWithPopup(auth, provider);
      
      const profile = await getUserProfile(result.user.uid);
      if (!profile) {
        router.replace(`/${role}/onboarding`);
      } else {
        if (profile.status === "active") {
          void touchLastLogin(result.user.uid).catch(() => undefined);
          void logAudit(result.user.uid, "login");
        }
        router.replace(homeFor(profile.role));
      }
    } catch (err) {
      setError(errorMessage(err, "Google sign-in could not be completed. Try again or use an email sign-in link."));
    } finally {
      working.current = false;
      setPending(null);
    }
  };

  const busy = pending !== null;

  return <div className="page-shell workspace-shell grid lg:grid-cols-[1fr_440px] gap-12 lg:gap-20 items-center max-w-[1100px]">
    <div>
      <Link href={isLogin ? "/login" : "/register"} className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-brand-200 mb-8"><ArrowLeft className="size-3.5" aria-hidden /> Choose a different account</Link>
      <p className="eyebrow mb-5">{roleLabel} workspace</p>
      <h1 className="text-4xl sm:text-5xl lg:text-[3.7rem] font-medium tracking-[-.055em] leading-[1.08]">
        {role === "doctor" ? <>Your expertise.<br /><span className="gradient-text">Their next step.</span></> : <>Clarity starts<br /><span className="gradient-text">right here.</span></>}
      </h1>
      <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-md mt-6">
        {role === "doctor" ? "A focused workspace to review medical records and offer patients an informed second perspective." : "A private space to share your records, connect with a specialist, and understand your options."}
      </p>
      <div className="hidden lg:flex flex-col gap-5 mt-10">
        {(role === "doctor" ? [
          { icon: ShieldCheck, title: "Verified expertise", text: "Credentials checked before case assignment." },
          { icon: Stethoscope, title: "Cases in your specialty", text: "Records matched to your field of practice." },
          { icon: FileText, title: "Thoughtful reviews", text: "A clear space to write and share your opinion." },
        ] : [
          { icon: ShieldCheck, title: "Specialist expertise", text: "Your case reviewed by a verified doctor." },
          { icon: FileText, title: "Everything together", text: "Your reports and opinions, in one place." },
          { icon: LockKeyhole, title: "Private by design", text: "Account access through your email or Google." },
        ]).map(({ icon: Icon, title, text }) => <div className="flex items-center gap-4" key={title}><span className="icon-tile size-10! rounded-xl!"><Icon className="size-4" aria-hidden /></span><div><p className="text-sm text-zinc-200">{title}</p><p className="text-xs text-zinc-500 mt-1">{text}</p></div></div>)}
      </div>
    </div>
    <Card className="w-full">
      <span className="status-pill mb-5">{roleLabel} account</span>
      <h2 className="text-2xl font-medium tracking-tight">{isLogin ? "Welcome back." : "Let’s get you started."}</h2>
      <p className="text-sm text-zinc-400 mt-2 mb-7">{isLogin ? "Sign in to continue your care journey." : "Create your account, then complete your profile."}</p>
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        {step === "email" ? <>
          <Button id={role + "-" + mode + "-google-btn"} type="button" variant="secondary" onClick={handleGoogleSignIn} loading={pending === "google"} disabled={busy}>
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg> Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500"><span className="h-px bg-white/10 flex-1" />or use your email<span className="h-px bg-white/10 flex-1" /></div>
          <form onSubmit={handleSendLink} className="space-y-5" noValidate>
            <Field id={role + "-" + mode + "-email"} label="Email address" error={emailError} hint="We’ll email you a secure sign-in link. No password needed.">
              <div className="relative"><Mail className="absolute left-4 top-4 size-4 text-zinc-500 pointer-events-none" aria-hidden />
                <Input id={role + "-" + mode + "-email"} accent={accent} type="email" autoComplete="email" inputMode="email" value={email} invalid={!!emailError} onChange={e => { setEmail(e.target.value); setEmailError(undefined); }} required className="pl-11" placeholder="you@example.com" aria-describedby={emailError ? undefined : role + "-" + mode + "-email-hint"} />
              </div>
            </Field>
            <label className="flex items-center gap-2.5 text-xs text-zinc-400 min-h-8"><input type="checkbox" checked={remember} onChange={event => setRemember(event.target.checked)} /> Remember me on this device</label>
            <Button id={role + "-" + mode + "-send-link-btn"} type="submit" accent={accent} loading={pending === "email"} disabled={busy || cooldown > 0}>
              {cooldown > 0 ? "Try again in " + cooldown + "s" : "Continue with email"} <ArrowRight className="size-4" aria-hidden />
            </Button>
          </form>
        </> : <div className="space-y-4">
          <div role="status" className="rounded-2xl border border-brand-300/20 bg-brand-300/5 p-6 text-center">
            <span className="icon-tile mx-auto mb-4"><Mail className="size-5" aria-hidden /></span>
            <h3 className="text-lg font-medium mb-2">Check your inbox.</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">We sent a sign-in link to <strong className="text-zinc-100 break-all">{email}</strong>. Open it to continue securely.</p>
          </div>
          <Button type="button" variant="secondary" disabled={busy || cooldown > 0} loading={pending === "email"} onClick={() => handleSendLink()}>{cooldown > 0 ? "Resend link in " + cooldown + "s" : "Resend sign-in link"}</Button>
          <button type="button" disabled={busy} onClick={() => { setStep("email"); setError(null); }} className="w-full min-h-10 text-xs text-zinc-400 hover:text-white">Use a different email</button>
        </div>}
      </div>
      <p className="text-xs text-zinc-400 text-center border-t border-white/10 pt-6 mt-7">{isLogin ? "New to SecondCare? " : "Already have an account? "}<Link href={isLogin ? "/" + role + "/register" : "/" + role + "/login"} className="text-brand-200 hover:underline">{isLogin ? "Create an account" : "Sign in"}</Link></p>
      {!isLogin && <p className="text-[11px] text-zinc-500 text-center leading-relaxed mt-4">Review our <Link href="/terms" className="underline hover:text-zinc-200">Terms</Link> and <Link href="/privacy" className="underline hover:text-zinc-200">Privacy Policy</Link> before creating your account.</p>}
    </Card>
  </div>;
}
