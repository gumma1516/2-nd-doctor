import { requireDoctor } from "@/lib/server/firebase-admin";
import { HttpError } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    await requireDoctor(request);
    // Medical information cannot be sent to an external AI provider until
    // explicit patient consent and case-based access checks are implemented.
    return Response.json({ error: "AI assistance is not enabled for medical records." }, { status: 503 });
  } catch (error) {
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "AI assistance is unavailable." }, { status: 503 });
  }
}
