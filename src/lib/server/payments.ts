import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminBucket, adminDb } from "./firebase-admin";
import { HttpError } from "./http";
import { capturedPaymentMatches, CONSULTATION_AMOUNT_PAISE, PAYMENT_CURRENCY, type GatewayOrder, type GatewayPayment } from "./payment-validation";

export function gatewayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new HttpError(503, "Checkout is not configured. The administrator must configure Razorpay credentials and the payment webhook.");
  }
  return { keyId, secret };
}

async function gateway<T>(path: string, body?: object): Promise<T> {
  const { keyId, secret } = gatewayConfig();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store", signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new HttpError(502, "The payment gateway is unavailable. Please retry; your reports are saved.");
  return await response.json() as T;
}

export async function ownedCase(uid: string, caseId: string) {
  const reference = adminDb().doc(`cases/${caseId}`);
  const snapshot = await reference.get();
  const data = snapshot.data();
  if (!data || data.ownerId !== uid) throw new HttpError(404, "Consultation not found.");
  return { reference, data };
}

export async function markCaptured(caseId: string, paymentId: string, expectedOrderId: string) {
  const [payment, order] = await Promise.all([
    gateway<GatewayPayment>(`payments/${encodeURIComponent(paymentId)}`),
    gateway<GatewayOrder>(`orders/${encodeURIComponent(expectedOrderId)}`),
  ]);
  if (payment.id !== paymentId || !capturedPaymentMatches(payment, order, expectedOrderId)) {
    throw new HttpError(409, "Payment is not yet captured and confirmed. Check payment status again shortly; do not make another payment.");
  }
  const reference = adminDb().doc(`cases/${caseId}`);
  await adminDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(reference);
    const data = snap.data();
    if (!data || data.paymentOrderId !== expectedOrderId || data.amount !== CONSULTATION_AMOUNT_PAISE / 100) {
      throw new HttpError(409, "Payment does not match the consultation.");
    }
    if (data.paymentStatus === "PAID") {
      if (data.paymentId !== paymentId) throw new HttpError(409, "This consultation already has a different payment.");
      return; // Webhook retries must never overwrite a completed medical opinion.
    }
    if (data.status !== "AWAITING_PAYMENT" || data.paymentStatus !== "PENDING") throw new HttpError(409, "Consultation cannot accept payment.");
    transaction.update(reference, { status: "IN_REVIEW", paymentStatus: "PAID", paymentId, paidAt: FieldValue.serverTimestamp() });
  });
}

export async function createOrder(uid: string, caseId: string) {
  const { keyId } = gatewayConfig();
  const { reference, data: caseData } = await ownedCase(uid, caseId);
  if (caseData.paymentStatus !== "PAID") {
    const files = caseData.files;
    if (!Array.isArray(files) || !files.length || files.length > 20) throw new HttpError(409, "Upload your reports before checkout.");
    const bucket = adminBucket();
    const allowed = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    let totalSize = 0;
    await Promise.all(files.map(async (file) => {
      if (typeof file.path !== "string" || !file.path.startsWith(`users/${uid}/cases/${caseId}/`) || file.path.includes("..")) throw new HttpError(409, "Invalid report attachment.");
      const [metadata] = await bucket.file(file.path).getMetadata();
      const size = Number(metadata.size);
      if (!allowed.includes(metadata.contentType ?? "") || !Number.isFinite(size) || size <= 0 || size > 50 * 1024 ** 2 || size !== file.size || metadata.contentType !== file.contentType) {
        throw new HttpError(409, "Report upload is incomplete or invalid. Upload the reports again.");
      }
      totalSize += size;
    }));
    if (totalSize > 500 * 1024 ** 2) throw new HttpError(409, "Reports exceed the total upload limit.");
  }
  const lock = adminDb().doc(`paymentLocks/${caseId}`);
  const lease = randomUUID();
  const existing = await adminDb().runTransaction(async (transaction) => {
    const [snapshot, lockSnapshot] = await Promise.all([transaction.get(reference), transaction.get(lock)]);
    const data = snapshot.data();
    if (!data || data.ownerId !== uid) throw new HttpError(404, "Consultation not found.");
    if (data.paymentStatus === "PAID") return { paid: true as const, orderId: data.paymentOrderId as string };
    if (data.status !== "AWAITING_PAYMENT" || data.paymentStatus !== "PENDING" || data.amount !== CONSULTATION_AMOUNT_PAISE / 100 || !Array.isArray(data.files) || !data.files.length) {
      throw new HttpError(409, "Complete your consultation and upload the reports before paying.");
    }
    if (data.paymentOrderId) return { paid: false as const, orderId: data.paymentOrderId as string };
    if ((lockSnapshot.data()?.expiresAt ?? 0) > Date.now()) throw new HttpError(409, "Checkout is being prepared. Please retry in a moment.");
    transaction.set(lock, { lease, expiresAt: Date.now() + 60000 });
    return null;
  });
  if (existing?.paid) return { paid: true, caseId };
  let orderId = existing?.orderId;
  if (!orderId) {
    try {
      const order = await gateway<GatewayOrder>("orders", { amount: CONSULTATION_AMOUNT_PAISE, currency: PAYMENT_CURRENCY, receipt: caseId.slice(0, 40), notes: { caseId }, partial_payment: false });
      if (!order.id || order.amount !== CONSULTATION_AMOUNT_PAISE || order.currency !== PAYMENT_CURRENCY) throw new HttpError(502, "Invalid payment gateway order.");
      orderId = await adminDb().runTransaction(async (transaction) => {
        const [snap, lockSnap] = await Promise.all([transaction.get(reference), transaction.get(lock)]);
        if (lockSnap.data()?.lease !== lease || snap.data()?.status !== "AWAITING_PAYMENT") throw new HttpError(409, "Checkout changed. Please retry.");
        const selectedId = snap.data()?.paymentOrderId ?? order.id;
        transaction.update(reference, { paymentOrderId: selectedId });
        transaction.set(adminDb().doc(`paymentOrders/${selectedId}`), { caseId });
        transaction.delete(lock);
        return selectedId as string;
      });
    } catch (error) {
      await adminDb().runTransaction(async (transaction) => {
        if ((await transaction.get(lock)).data()?.lease === lease) transaction.delete(lock);
      }).catch(() => undefined);
      throw error;
    }
  }
  const order = await gateway<GatewayOrder>(`orders/${encodeURIComponent(orderId)}`);
  if (order.status === "paid") {
    const payments = await gateway<{ items: GatewayPayment[] }>(`orders/${encodeURIComponent(orderId)}/payments`);
    const payment = payments.items.find((entry) => entry.status === "captured");
    if (!payment) throw new HttpError(409, "Payment confirmation is pending. Please check again shortly.");
    await markCaptured(caseId, payment.id, orderId);
    return { paid: true, caseId };
  }
  if (order.amount !== CONSULTATION_AMOUNT_PAISE || order.currency !== PAYMENT_CURRENCY) throw new HttpError(409, "Payment amount does not match the consultation.");
  return { paid: false, caseId, keyId, orderId, amount: CONSULTATION_AMOUNT_PAISE, currency: PAYMENT_CURRENCY };
}
