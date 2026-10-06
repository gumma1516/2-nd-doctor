export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  // Provider/credential errors can contain private information; never return them to a browser.
  console.error("Payment request failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: "Payment service is temporarily unavailable. Your consultation is saved; please try again later." }, { status: 503 });
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const raw = await request.text();
  if (raw.length > 4096) throw new HttpError(413, "Request is too large.");
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch { throw new HttpError(400, "Invalid request body."); }
}

export function validId(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[\w-]{1,128}$/.test(value)) throw new HttpError(400, `Invalid ${label}.`);
  return value;
}
