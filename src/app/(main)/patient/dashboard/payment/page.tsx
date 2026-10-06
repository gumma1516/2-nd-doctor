"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, ArrowRight, ArrowLeft, Smartphone, CreditCard, Landmark, FileText } from "lucide-react";
import { Alert, Button, Card } from "@/components/ui";
import { PRICING, formatINR } from "@/lib/constants";
import { draftStore, type SavedDraft } from "@/lib/draft-store";
import { ClientOnly } from "@/components/ClientOnly";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createCase } from "@/lib/data/cases";

const METHODS = [
  { id: "upi", label: "UPI", desc: "GPay, PhonePe, Paytm", Icon: Smartphone },
  { id: "card", label: "Card", desc: "Credit / Debit", Icon: CreditCard },
  { id: "netbanking", label: "Net Banking", desc: "All major banks", Icon: Landmark },
] as const;

/**
 * Checkout page.
 *
 * SECURITY: We intentionally do NOT collect card numbers/CVC here.
 * Handling raw card data would put the app in PCI-DSS scope. In Phase 3,
 * `handlePayment` will: (1) call a server route that creates a Razorpay order
 * with a server-computed amount, (2) open Razorpay Checkout, and (3) confirm
 * via a signed webhook before marking the case as PAID.
 */
export default function PaymentPage() {
  return (
    <ClientOnly fallback={<div className="flex-1 bg-zinc-950" />}>
      <Checkout />
    </ClientOnly>
  );
}

function Checkout() {
  const router = useRouter();
  const { user } = useAuth();
  const [draft, setDraft] = useState<SavedDraft | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("upi");
  const [loading, setLoading] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoadingDraft(false);
      return;
    }
    draftStore.get(user.uid)
      .then(setDraft)
      .catch(console.error)
      .finally(() => setIsLoadingDraft(false));
  }, [user]);

  const handlePayment = async () => {
    if (!draft || !user) return;
    setLoading(true);
    // Simulated gateway round-trip (replace with Razorpay in Phase 3).
    await new Promise((r) => setTimeout(r, 1800));
    
    try {
      const id = await createCase(user.uid, {
        id: draft.draft.id,
        department: draft.draft.department,
        chiefComplaint: draft.draft.chiefComplaint,
        medications: draft.draft.medications,
        consentAt: draft.draft.consentAt,
        files: draft.files,
      });
      
      await draftStore.clear(user.uid);
      setCaseId(id);
    } catch (err) {
      console.error(err);
      alert("Failed to submit case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingDraft) {
    return <div className="flex-1 flex items-center justify-center bg-zinc-950 py-12 px-4" />;
  }

  if (caseId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 py-12 px-4">
        <Card className="max-w-md w-full p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
          <div className="relative z-10">
            <div className="size-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="size-10" aria-hidden />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Payment Successful</h1>
            <p className="text-zinc-400 mb-2">Your case has been submitted for specialist review.</p>
            <p className="text-sm text-zinc-500 mb-8">
              Case ID: <span className="font-mono text-zinc-300">{caseId}</span>
            </p>
            <Button id="go-to-dashboard-btn" onClick={() => router.push("/patient/dashboard")}>
              Go to My Dashboard <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950 py-12 px-4">
        <Card className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-3">No consultation in progress</h1>
          <p className="text-zinc-400 mb-6">Please fill in your consultation details before making a payment.</p>
          <Link
            href="/patient/dashboard/new-consultation"
            id="start-new-consultation-link"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Start a Consultation <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 items-center">
      <div className="max-w-4xl w-full mb-6">
        <Link
          href="/patient/dashboard/new-consultation"
          id="back-to-consultation-link"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden /> Edit consultation details
        </Link>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Order Summary */}
        <Card className="flex flex-col justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-6">Order Summary</h1>

            <div className="mb-6 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <p className="text-sm text-zinc-500">Department</p>
              <p className="text-white font-medium">{draft.draft.department}</p>
              <p className="text-sm text-zinc-500 pt-2 flex items-center gap-2">
                <FileText className="size-4" aria-hidden /> {draft.files.length} report
                {draft.files.length !== 1 && "s"} attached
              </p>
            </div>

            <dl className="space-y-4 mb-6">
              <div className="flex justify-between text-zinc-300 pb-4 border-b border-zinc-800">
                <dt>Specialist Consultation Fee</dt>
                <dd className="font-medium text-white">{formatINR(PRICING.consultationFee)}</dd>
              </div>
              <div className="flex justify-between text-zinc-400 pb-4 border-b border-zinc-800">
                <dt>Platform Fee (incl. GST)</dt>
                <dd>{formatINR(PRICING.platformFee)}</dd>
              </div>
              <div className="flex justify-between items-center pt-2">
                <dt className="text-lg text-zinc-300 font-medium">Total Amount</dt>
                <dd className="text-3xl font-bold text-brand-400">{formatINR(PRICING.total)}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-zinc-500 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50">
            <Lock className="size-4 text-emerald-500 shrink-0" aria-hidden />
            <span>Payments are processed by a PCI-DSS compliant payment gateway. We never store your card details.</span>
          </div>
        </Card>

        {/* Payment method */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 size-64 bg-brand-500/5 blur-3xl rounded-full" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-6">Payment Method</h2>

            <fieldset className="space-y-3 mb-6">
              <legend className="sr-only">Choose a payment method</legend>
              {METHODS.map(({ id, label, desc, Icon }) => (
                <label
                  key={id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-colors",
                    method === id
                      ? "border-brand-500 bg-brand-500/10"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    id={`pay-method-${id}`}
                    value={id}
                    checked={method === id}
                    onChange={() => setMethod(id)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center border",
                      method === id
                        ? "bg-brand-500/20 border-brand-500/30 text-brand-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div>
                    <p className="text-white font-medium">{label}</p>
                    <p className="text-xs text-zinc-500">{desc}</p>
                  </div>
                </label>
              ))}
            </fieldset>

            <div className="mb-6">
              <Alert tone="info">
                Demo mode: no real charge is made. A secure gateway checkout (Razorpay) will open here in production.
              </Alert>
            </div>

            <Button
              id="pay-now-btn"
              onClick={handlePayment}
              loading={loading}
              className="py-4 text-lg font-bold"
            >
              Pay {formatINR(PRICING.total)} <ArrowRight className="size-5" aria-hidden />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
