import { createHmac, timingSafeEqual } from "node:crypto";

export const CONSULTATION_AMOUNT_PAISE = 165000;
export const PAYMENT_CURRENCY = "INR";

export type GatewayPayment = { id: string; order_id: string; amount: number; currency: string; status: string; captured: boolean };
export type GatewayOrder = { id: string; amount: number; amount_paid: number; currency: string; status: string };

export function validSignature(payload: string | Buffer, signature: unknown, secret: string): boolean {
  if (typeof signature !== "string" || !/^[a-fA-F0-9]{64}$/.test(signature) || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function capturedPaymentMatches(payment: GatewayPayment, order: GatewayOrder, expectedOrderId: string): boolean {
  return payment.order_id === expectedOrderId && order.id === expectedOrderId &&
    payment.amount === CONSULTATION_AMOUNT_PAISE && order.amount === CONSULTATION_AMOUNT_PAISE &&
    order.amount_paid === CONSULTATION_AMOUNT_PAISE && payment.currency === PAYMENT_CURRENCY &&
    order.currency === PAYMENT_CURRENCY && payment.status === "captured" && payment.captured === true && order.status === "paid";
}
