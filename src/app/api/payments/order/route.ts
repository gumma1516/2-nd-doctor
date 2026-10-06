import { requirePatient } from "@/lib/server/firebase-admin";
import { errorResponse, readBody, validId } from "@/lib/server/http";
import { createOrder } from "@/lib/server/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const uid = await requirePatient(request);
    const body = await readBody(request);
    return Response.json(await createOrder(uid, validId(body.caseId, "consultation ID")));
  } catch (error) { return errorResponse(error); }
}
