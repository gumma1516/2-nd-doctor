import { adminDb } from "@/lib/server/firebase-admin";
import { errorResponse, HttpError, validId } from "@/lib/server/http";
import { markCaptured } from "@/lib/server/payments";
import { validSignature } from "@/lib/server/payment-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(503, "Payment webhook is not configured.");
    const rawBody = Buffer.from(await request.arrayBuffer());
    if (rawBody.length > 1048576) throw new HttpError(413, "Webhook payload too large.");
    if (!validSignature(rawBody, request.headers.get("x-razorpay-signature"), secret)) throw new HttpError(400, "Invalid webhook signature.");
    let event;
    try { event = JSON.parse(rawBody.toString("utf8")); }
    catch { throw new HttpError(400, "Invalid webhook payload."); }
    if (event.event !== "payment.captured" && event.event !== "order.paid") return Response.json({ received: true });
    const payment = event.payload?.payment?.entity;
    const paymentId = validId(payment?.id, "payment ID");
    const orderId = validId(payment?.order_id, "order ID");
    const mapping = await adminDb().doc(`paymentOrders/${orderId}`).get();
    if (!mapping.exists) throw new HttpError(409, "Payment order is not registered yet. Retry delivery.");
    await markCaptured(validId(mapping.data()?.caseId, "consultation ID"), paymentId, orderId);
    return Response.json({ received: true });
  } catch (error) { return errorResponse(error); }
}
