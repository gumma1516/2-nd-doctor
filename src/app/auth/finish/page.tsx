"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { EMAIL_REGEX, isLoginLink, completeLoginLink, getPendingEmail, getPendingIntent, homeFor } from "@/lib/auth/email-link";
import { getUserProfile, logAudit, touchLastLogin } from "@/lib/data/users";

export default function AuthFinishPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "email-required">("loading");
  const [emailInput, setEmailInput] = useState("");
  const [error, setError] = useState("");
  const handled = useRef(false);
  const signedIn = useRef<User | null>(null);
  const [emailUsed, setEmailUsed] = useState("");
  const [hasCredential, setHasCredential] = useState(false);

  const processLogin = useCallback(async (email: string, url: string) => {
    setStatus("loading");
    setEmailUsed(email);
    try {
      const intent = getPendingIntent(url);
      // Keep the successful credential while retrying a failed profile lookup; links are single-use.
      const user = signedIn.current ?? await completeLoginLink(email, url, intent?.remember ?? false);
      signedIn.current = user;
      setHasCredential(true);
      const profile = await getUserProfile(user.uid);
      if (profile?.status === "active") {
        void touchLastLogin(user.uid).catch(() => undefined);
        void logAudit(user.uid, "login");
      }
      router.replace(profile ? homeFor(profile.role) : intent ? `/${intent.role}/onboarding` : "/auth/onboarding");
    } catch (error) {
      setStatus("error");
      setError(error instanceof Error ? error.message : "Failed to sign in. Request a new link and try again.");
    }
  }, [router]);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    void Promise.resolve().then(() => {
      const url = window.location.href;
      if (!isLoginLink(url)) {
        setStatus("error");
        setError("Invalid or expired login link. Request a new link to continue.");
        return;
      }
      const email = getPendingEmail();
      if (email) void processLogin(email, url);
      else setStatus("email-required");
    });
  }, [processLogin]);

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (EMAIL_REGEX.test(emailInput.trim())) void processLogin(emailInput.trim(), window.location.href);
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full text-center space-y-6">
        {status === "loading" && <div role="status" className="space-y-4">
          <Loader2 className="size-10 animate-spin text-brand-500 mx-auto" aria-hidden />
          <h1 className="text-xl font-semibold text-white">Completing sign in…</h1>
        </div>}
        {status === "error" && <>
          <h1 className="text-xl font-semibold text-white">Sign in needs attention</h1>
          <Alert>{error}</Alert>
          {emailUsed && <Button onClick={() => void processLogin(emailUsed, window.location.href)}>Try again</Button>}
          {!hasCredential && <Button variant="secondary" onClick={() => { setEmailInput(""); setStatus("email-required"); setError(""); }}>Confirm a different email</Button>}
          <Link href="/login" className="block text-brand-400 hover:text-brand-300">Request a new sign-in link</Link>
        </>}
        {status === "email-required" && <form onSubmit={handleEmailSubmit} className="space-y-4">
          <h1 className="text-xl font-semibold text-white">Confirm your email</h1>
          <p className="text-zinc-400 text-sm">Enter the email address you used to request this sign-in link.</p>
          <Field id="confirm-email" label="Email address">
            <Input id="confirm-email" type="email" autoComplete="email" value={emailInput} onChange={(event) => setEmailInput(event.target.value)} required />
          </Field>
          <Button type="submit">Continue</Button>
        </form>}
      </Card>
    </div>
  );
}
