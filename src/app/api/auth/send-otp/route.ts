/** The prototype SMS flow was retired; use Firebase email links or Google. */
export async function POST() {
  return Response.json({ error: "SMS sign-in is unavailable. Use email or Google sign-in." }, { status: 410 });
}
