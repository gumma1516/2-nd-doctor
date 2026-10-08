"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { WorkspaceHeader } from "@/components/WorkspaceUI";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { RequireAuth } from "@/lib/auth/RequireAuth";
import { normalizeProfile } from "@/lib/auth/profile-input";
import { updateUserProfile } from "@/lib/data/users";
import { DEFAULT_SETTINGS, type UserProfile, type UserSettings } from "@/lib/data/types";
import { errorMessage } from "@/lib/errors";

export default function AccountPage() {
  const { profile } = useAuth();
  return <RequireAuth>{profile && <AccountForm key={profile.uid} profile={profile} />}</RequireAuth>;
}

function AccountForm({ profile }: { profile: UserProfile }) {
  const { logout, logoutAllDevices } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: profile.fullName, phone: profile.phone, dob: profile.dob ?? "", place: profile.place ?? "" });
  const [settings, setSettings] = useState<UserSettings>(profile.settings ?? DEFAULT_SETTINGS);
  const [busy, setBusy] = useState<"save" | "logout" | "logout-all" | null>(null);
  const working = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const change = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setNotice(null);
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (working.current) return;
    working.current = true;
    setBusy("save"); setError(null); setNotice(null);
    try {
      const normalized = normalizeProfile(form, profile.role === "patient");
      await updateUserProfile(profile.uid, { ...normalized, settings });
      setForm({ ...normalized, dob: normalized.dob ?? "", place: normalized.place ?? "" });
      setNotice("Your profile and communication preferences have been saved.");
    } catch (err) { setError(errorMessage(err, "Could not save your profile. Try again.")); }
    finally { working.current = false; setBusy(null); }
  };
  const signOut = async (all: boolean) => {
    if (working.current) return;
    working.current = true;
    setBusy(all ? "logout-all" : "logout"); setError(null); setNotice(null);
    try {
      await (all ? logoutAllDevices() : logout());
      router.replace("/login");
    } catch (err) { setError(errorMessage(err, "Could not sign out. Check your connection and try again.")); }
    finally { working.current = false; setBusy(null); }
  };
  return <div className="page-shell workspace-shell max-w-[920px] space-y-6">
    <WorkspaceHeader eyebrow="Account settings" title="A space that’s yours." description="Keep your details up to date and manage your account preferences." />
    {error && <Alert>{error}</Alert>}{notice && <Alert tone="success">{notice}</Alert>}
    <Card>
      <form onSubmit={save} className="space-y-6" noValidate>
        <div className="flex items-center gap-4 pb-6 border-b border-white/10"><span className="icon-tile size-14!"><UserRound className="size-6" aria-hidden /></span><div className="min-w-0"><h2 className="text-lg font-medium">{profile.fullName}</h2><p className="text-xs text-zinc-400 mt-1 break-all">{profile.email}</p><span className="status-pill capitalize mt-3">{profile.role} · {profile.status}</span></div></div>
        {profile.role === "doctor" && <p className="text-sm text-zinc-400">Your verified medical credentials and specialty stay linked to your original application. Contact the administrator to correct these details.</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="account-name" label="Full name"><Input id="account-name" autoComplete="name" required minLength={3} maxLength={120} value={form.fullName} onChange={change("fullName")} /></Field>
          <Field id="account-phone" label="Mobile number"><Input id="account-phone" type="tel" autoComplete="tel" required maxLength={16} value={form.phone} onChange={change("phone")} /></Field>
          <Field id="account-dob" label={profile.role === "patient" ? "Date of birth" : "Date of birth (optional)"}><Input id="account-dob" type="date" min="1900-01-01" autoComplete="bday" required={profile.role === "patient"} value={form.dob} onChange={change("dob")} /></Field>
          <Field id="account-place" label={profile.role === "patient" ? "City / place" : "City / place (optional)"}><Input id="account-place" autoComplete="address-level2" required={profile.role === "patient"} maxLength={120} value={form.place} onChange={change("place")} /></Field>
        </div>
        <fieldset className="space-y-4 border-t border-zinc-800 pt-5">
          <legend className="px-1 font-semibold text-white"><SlidersHorizontal className="inline size-4 text-brand-200 mr-2" aria-hidden />Communication preferences</legend>
          <label className="flex items-center gap-3 text-sm text-zinc-300"><input type="checkbox" checked={settings.emailNotifications} onChange={(event) => { setSettings((value) => ({ ...value, emailNotifications: event.target.checked })); setNotice(null); }} />Allow optional email updates</label>
          <Field id="account-language" label="Preferred communication language"><Select id="account-language" value={settings.language} onChange={(event) => { setSettings((value) => ({ ...value, language: event.target.value as UserSettings["language"] })); setNotice(null); }}><option value="en">English</option><option value="hi">Hindi</option></Select></Field>
          <p className="text-xs text-zinc-500">These preferences are saved for communications. Sign-in emails remain necessary to access your account.</p>
        </fieldset>
        <Button type="submit" className="sm:w-auto" loading={busy === "save"} disabled={busy !== null}>Save changes</Button>
      </form>
    </Card>
    <Card><span className="icon-tile mb-5"><ShieldCheck className="size-5" aria-hidden /></span><h2 className="text-xl font-medium tracking-tight text-white">Your account security</h2><p className="my-3 text-sm text-zinc-400">Signing out clears medical drafts stored in this browser. Signing out of all devices also ends access from your other existing sessions.</p><div className="flex flex-wrap gap-3"><Button className="sm:w-auto" variant="secondary" loading={busy === "logout"} disabled={busy !== null} onClick={() => void signOut(false)}>Sign out</Button><Button className="sm:w-auto" variant="secondary" loading={busy === "logout-all"} disabled={busy !== null} onClick={() => void signOut(true)}>Sign out of all devices</Button></div></Card>
  </div>;
}
