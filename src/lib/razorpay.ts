"use client";

export type CheckoutResult = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string; order_id: string; amount: number; currency: string;
  name: string; description: string; prefill: { email?: string; name?: string };
  handler: (result: CheckoutResult) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};
type CheckoutInstance = { open: () => void; close: () => void; on: (event: string, handler: () => void) => void };
type CheckoutConstructor = new (options: CheckoutOptions) => CheckoutInstance;
declare global { interface Window { Razorpay?: CheckoutConstructor } }

let loading: Promise<CheckoutConstructor> | null = null;

function loadCheckout(): Promise<CheckoutConstructor> {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => fail(), 20000);
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = null;
      reject(new Error("The payment window could not load. Check your connection and retry."));
    };
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (!window.Razorpay) { fail(); return; }
      resolve(window.Razorpay);
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function openCheckout(options: Omit<CheckoutOptions, "handler" | "modal" | "theme">): Promise<CheckoutResult> {
  const Checkout = await loadCheckout();
  return new Promise((resolve, reject) => {
    let settled = false;
    const instance = new Checkout({
      ...options, theme: { color: "#10b981" },
      handler(result) { settled = true; resolve(result); },
      modal: { ondismiss() {
        if (!settled) { settled = true; reject(new Error("Checkout closed. Your consultation is saved; resume payment when ready.")); }
      } },
    });
    instance.on("payment.failed", () => {
      if (!settled) {
        settled = true;
        instance.close();
        reject(new Error("The payment was unsuccessful. Retry to check its status before paying again."));
      }
    });
    instance.open();
  });
}
