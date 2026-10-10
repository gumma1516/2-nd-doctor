"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { User } from "firebase/auth";
import { CheckCircle2, Lock, ArrowRight, FileText } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { WorkspaceHeader } from "@/components/WorkspaceUI";
import { ConsultationSteps } from "@/components/ConsultationSteps";
import { PRICING, formatINR } from "@/lib/constants";
import { draftStore, type SavedDraft } from "@/lib/draft-store";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createCase, displayCaseId, getMyCase } from "@/lib/data/cases";
import type { Case } from "@/lib/data/types";
import { openCheckout } from "@/lib/razorpay";

type Order = { paid: true; caseId: string } | { paid: false; caseId: string; keyId: string; orderId: string; amount: number; currency: string };

async function paymentRequest<T>(user: User, endpoint: string, body: object): Promise<T> {
  const response = await fetch(`/api/payments/${endpoint}`, {
    method: "POST", headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Payment confirmation is unavailable. Your consultation is saved; retry to check its status.");
  return result as T;
}

export default function PaymentPage() {
  return <Suspense fallback={<div className="p-8 text-zinc-400" role="status">Loading checkout…</div>}><Checkout /></Suspense>;
}

function Checkout() {
  const { user } = useAuth();
  const params = useSearchParams();
  const resumeId = params.get("caseId");
  if (!user) return <div className="p-8 text-zinc-400" role="status">Checking your account…</div>;
  return <PatientCheckout key={`${user.uid}:${resumeId ?? "draft"}`} user={user} resumeId={resumeId} />;
}

function PatientCheckout({ user, resumeId }: { user: User; resumeId: string | null }) {
  const [draft, setDraft] = useState<SavedDraft | null>(null);
  const [consultation, setConsultation] = useState<Case | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paidCaseId, setPaidCaseId] = useState<string | null>(null);
  const inProgress = useRef(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Uploaded cases remain payable on another device without the local draft.
      const saved = await draftStore.get(user.uid).catch((err: unknown) => { if (!resumeId) throw err; return null; });
      const id = resumeId ?? saved?.draft.id;
      const current = id ? await getMyCase(user.uid, id) : null;
      if (resumeId && !current) throw new Error("This consultation was not found for your account.");
      if (!active) return;
      setDraft(saved && (!resumeId || saved.draft.id === resumeId) ? saved : null);
      setConsultation(current);
    })().catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Unable to restore checkout."); })
      .finally(() => { if (active) setLoadingDraft(false); });
    return () => { active = false; };
  }, [user, resumeId]);

  const handlePayment = async () => {
    if (inProgress.current) return;
    inProgress.current = true;
    setLoading(true);
    setError("");
    try {
      let id = consultation?.id;
      if (!id || (!consultation?.files.length && consultation?.paymentStatus !== "PAID")) {
        if (!draft) throw new Error("Reports have not finished uploading. Resume checkout on the browser where you selected them.");
        id = await createCase(user.uid, { ...draft.draft, files: draft.files });
        setConsultation(await getMyCase(user.uid, id));
      }
      const order = await paymentRequest<Order>(user, "order", { caseId: id });
      if (!order.paid) {
        const receipt = await openCheckout({
          key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
          name: "SecondCare", description: "Specialist second opinion", prefill: { email: user.email ?? undefined },
        });
        const verified = await paymentRequest<{ paid: boolean }>(user, "verify", { caseId: id, ...receipt });
        if (!verified.paid) throw new Error("Payment confirmation is pending. Retry to check its status before paying again.");
      }
      setPaidCaseId(id);
      // Local cleanup failure must not turn a confirmed payment into an apparent failure.
      await draftStore.clear(user.uid, id).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to confirm payment. Retry to check payment status.");
    } finally {
      inProgress.current = false;
      setLoading(false);
    }
  };

  if (loadingDraft) return <div className="p-8 text-zinc-400" role="status">Restoring your consultation and reports…</div>;

  if (paidCaseId) return (
    <div className="flex-1 flex items-center justify-center py-12 px-4">
      <Card className="max-w-lg w-full p-10 text-center">
        <CheckCircle2 className="size-16 text-emerald-400 mx-auto mb-6" aria-hidden />
        <h1 className="text-3xl font-medium tracking-[-.04em] text-white mb-3">Payment confirmed</h1>
        <p className="text-zinc-400 mb-3">Your reports are submitted. Your dashboard shows the assigned specialist or whether your consultation is awaiting specialist assignment.</p>
        <p className="text-sm text-zinc-500 mb-8">Consultation reference: <span className="font-mono text-zinc-300">{displayCaseId(paidCaseId)}</span></p>
        <Link href="/patient/dashboard" className="primary-link">Go to my dashboard <ArrowRight className="inline size-4" aria-hidden /></Link>
      </Card>
    </div>
  );

  if (!draft && !consultation) return (
    <div className="max-w-lg mx-auto py-12 px-4"><Card>
      <h1 className="text-2xl font-medium tracking-tight text-white mb-3">No consultation ready for checkout</h1>
      {error && <Alert>{error}</Alert>}
      <p className="text-zinc-400 my-6">Start a consultation or resume an uploaded consultation from your dashboard.</p>
      <Link href="/patient/dashboard" className="text-brand-400 hover:underline">My Dashboard</Link>
      <Link href="/patient/dashboard/new-consultation" className="block mt-4 text-brand-400 hover:underline">Start a Consultation</Link>
    </Card></div>
  );

  const details = consultation ?? draft!.draft;
  const reportCount = consultation?.files.length || draft?.files.length || 0;
  return (
    <div className="page-shell workspace-shell">
      <div className="max-w-4xl mx-auto">
        <WorkspaceHeader eyebrow="Almost there" title="A clear review. A clear price." description="Review your consultation and confirm payment to begin specialist assignment." back={{href:"/patient/dashboard",label:"My consultations"}} /><ConsultationSteps current="payment" />
        <div className="grid md:grid-cols-2 gap-5 mt-6">
          <Card>
            <h1 className="text-2xl font-medium tracking-tight text-white mb-6">Consultation checkout</h1>
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 mb-6">
              <p className="text-sm text-zinc-500">Specialty</p>
              <p className="text-white font-medium mt-1">{details.department}</p>
              <p className="text-sm text-zinc-400 mt-3"><FileText className="inline size-4 mr-2" aria-hidden />{reportCount} report{reportCount === 1 ? "" : "s"} attached</p>
            </div>
            <dl className="space-y-4">
              <div className="flex justify-between text-zinc-300"><dt>Specialist consultation</dt><dd>{formatINR(PRICING.consultationFee)}</dd></div>
              <div className="flex justify-between text-zinc-400"><dt>Platform fee (incl. GST)</dt><dd>{formatINR(PRICING.platformFee)}</dd></div>
              <div className="flex justify-between border-t border-white/10 pt-4 text-white font-medium text-xl"><dt>Total</dt><dd>{formatINR(PRICING.total)}</dd></div>
            </dl>
            {!consultation && <Link href="/patient/dashboard/new-consultation" className="block text-brand-400 mt-6 hover:underline">Edit consultation details</Link>}
          </Card>
          <Card>
            <h2 className="text-2xl font-medium tracking-tight text-white mb-5">Secure payment</h2>
            <p className="text-zinc-400 mb-5">Choose an available payment method in Razorpay Checkout. Your consultation is submitted for review only after the server confirms payment.</p>
            <p className="text-sm text-zinc-500 mb-6"><Lock className="inline size-4 mr-2" aria-hidden />Card and bank details are entered directly in Razorpay.</p>
            {error && <div className="mb-6"><Alert>{error}</Alert></div>}
            <Button id="pay-now-btn" onClick={handlePayment} loading={loading} className="py-4">
              {consultation?.paymentStatus === "PAID" ? "Confirm submission" : consultation?.paymentOrderId ? "Check status / resume payment" : `Pay ${formatINR(PRICING.total)}`} <ArrowRight className="size-4" aria-hidden />
            </Button>
            <p className="text-xs text-zinc-500 mt-4">If a payment is pending, retry here to check its status. The same consultation and payment order are reused.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
