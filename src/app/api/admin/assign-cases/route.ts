import { SPECIALTIES, type Specialty } from "@/lib/constants";
import { assignPendingCases } from "@/lib/server/assignment";
import { requireAdmin } from "@/lib/server/firebase-admin";
import { HttpError, readBody, validId } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = await readBody(request);
    const limit = body.limit ?? 50;
    if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new HttpError(400, "Choose an assignment batch size from 1 to 50.");
    }
    const specialization = body.specialization;
    if (specialization !== undefined && !SPECIALTIES.includes(specialization as Specialty)) {
      throw new HttpError(400, "Select a valid specialty.");
    }
    const afterCaseId = body.afterCaseId === undefined ? undefined : validId(body.afterCaseId, "assignment cursor");
    return Response.json(await assignPendingCases({ limit, specialization: specialization as Specialty | undefined, afterCaseId }), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Case assignment failed", error instanceof Error ? error.name : "UnknownError");
    return Response.json({ error: "Assignment is temporarily unavailable. Paid consultations are saved; retry assignment shortly." }, { status: 503 });
  }
}
