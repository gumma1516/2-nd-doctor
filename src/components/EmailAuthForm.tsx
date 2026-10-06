"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight } from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/data/users";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { EMAIL_REGEX, sendLoginLink, RESEND_SECONDS, homeFor } from "@/lib/auth/email-link";

type Props = {
  mode: "login" | "register";
  role: "patient" | "doctor";
};

export function EmailAuthForm({ mode, role }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [remember, setRemember] = useState(true);

  const accent = role === "doctor" ? "teal" : "brand";
  const isLogin = mode === "login";
  const roleLabel = role === "doctor" ? "Doctor" : "Patient";

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    
    setLoading(true);
    try {
      await sendLoginLink(email.trim(), { role, remember });
      setStep("sent");
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send login link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const result = await signInWithPopup(auth, provider);
      
      const profile = await getUserProfile(result.user.uid);
      if (!profile) {
        router.replace(`/${role}/onboarding`);
      } else {
        router.replace(homeFor(profile.role));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">
            {isLogin ? `${roleLabel} Login` : `Create ${roleLabel} Account`}
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            {isLogin ? "Welcome back to SecondCare" : "Get started with SecondCare today"}
          </p>
        </div>

        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}

          {step === "email" ? (
            <>
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                Remember me on this device
              </label>
              <Button
                id={`${role}-${mode}-google-btn`}
                type="button"
                onClick={handleGoogleSignIn}
                loading={loading}
                className="w-full mb-4 bg-white text-zinc-900 hover:bg-zinc-100 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-zinc-900 text-zinc-500">Or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSendLink} className="space-y-4" noValidate>
                <Field id={`${role}-${mode}-email`} label="Email Address">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none gap-2 text-zinc-500">
                      <Mail className="size-5" aria-hidden />
                    </div>
                    <Input
                      id={`${role}-${mode}-email`}
                      accent={accent}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </Field>
                <Button id={`${role}-${mode}-send-link-btn`} type="submit" accent={accent} loading={loading}>
                  Send Magic Link <ArrowRight className="size-4" aria-hidden />
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-6">
                <Mail className={`size-12 mx-auto mb-4 ${accent === "teal" ? "text-teal-400" : "text-brand-400"}`} />
                <h3 className="text-lg font-semibold text-white mb-2">Check your email</h3>
                <p className="text-sm text-zinc-400">
                  We&apos;ve sent a magic link to <strong className="text-white">{email}</strong>. 
                  Click the link to securely sign in to your account.
                </p>
              </div>
              
              <div className="pt-4 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => handleSendLink()}
                  className="text-sm font-medium text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend magic link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError(null);
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link
            href={isLogin ? `/${role}/register` : `/${role}/login`}
            className={
              role === "doctor"
                ? "text-teal-400 hover:text-teal-300 font-semibold"
                : "text-brand-400 hover:text-brand-300 font-semibold"
            }
          >
            {isLogin ? "Register here" : "Log in"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
