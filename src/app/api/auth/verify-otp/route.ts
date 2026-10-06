/** Never issue the unsigned prototype session cookie. */
export async function POST() {
  return Response.json({ error: "SMS sign-in is unavailable. Use email or Google sign-in." }, { status: 410 });
}
