import { requirePatient } from "@/lib/server/firebase-admin";
import { errorResponse, HttpError, readBody, validId } from "@/lib/server/http";
import { gatewayConfig, markCaptured, ownedCase } from "@/lib/server/payments";
import { validSignature } from "@/lib/server/payment-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const uid = await requirePatient(request);
    const body = await readBody(request);
    const caseId = validId(body.caseId, "consultation ID");
    const paymentId = validId(body.razorpay_payment_id, "payment ID");
    const { data } = await ownedCase(uid, caseId);
    const { secret } = gatewayConfig();
    if (!data.paymentOrderId || data.paymentOrderId !== body.razorpay_order_id || !validSignature(`${data.paymentOrderId}|${paymentId}`, body.razorpay_signature, secret)) {
      throw new HttpError(400, "Payment signature is invalid.");
    }
    await markCaptured(caseId, paymentId, data.paymentOrderId);
    return Response.json({ paid: true, caseId });
  } catch (error) { return errorResponse(error); }
}
