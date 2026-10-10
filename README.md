# SecondCare

A second-opinion platform: patients upload medical records and receive a written
opinion from a verified specialist. Built with Next.js (App Router), Firebase
Auth / Firestore / Storage, and Razorpay for checkout.

## Requirements

- Node.js 20+
- A Firebase project (Auth, Firestore, Storage)
- Java 11+ — only to run the Firebase emulator test suites

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in — see the comments in that file
npm run dev
```

The app refuses to start half-configured: `src/lib/firebase.ts` throws without
the `NEXT_PUBLIC_FIREBASE_*` values, and the payment and assignment routes
return `503` until the server credentials are present.

`NEXT_PUBLIC_*` values are inlined into the client bundle, so they must be
present **at build time**, not only at runtime — `npm run build` fails without
them while prerendering. Set them in the CI/deployment environment too. The
server credentials (`FIREBASE_ADMIN_*`, `RAZORPAY_*`) are only read at runtime.

In the Firebase console, enable **Email link (passwordless sign-in)** and
**Google** under Authentication → Sign-in method, and add your origin under
Authentication → Settings → Authorized domains.

### Against the emulators

```bash
npx firebase emulators:start --project demo-secondcare --config firebase.emulators.json
```

Set `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-secondcare` and
`NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local`. The emulator switch is
honoured only for a `demo-*` project on a localhost origin, so it can never
redirect a real project's traffic.

To create a verified specialist to sign in as:

```bash
npx tsx scripts/seed-doctor.ts
```

## Checks

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run verify       # all three
npm test             # auth/account unit tests (no emulator needed)
npm run test:rules   # firestore.rules + storage.rules, on the emulators
npm run test:assignment  # case assignment and rotation, on the emulators
npm run test:all     # every suite
```

`npm run test:rules` needs Java on `PATH`. The two Cloud Storage cases in that
suite skip themselves when the Storage emulator cannot evaluate cross-service
`firestore.*` rules, which it currently cannot — those rules still apply in
production, so verify them against a staging bucket before launch.

## How it fits together

```
src/app/(main)/        public pages, patient and doctor workspaces
src/app/admin/         administrator workspace
src/app/api/           payments (order, verify, webhook), assignment, AI stubs
src/lib/auth/          passwordless email-link + Google sign-in, route guards
src/lib/data/          Firestore/Storage access for users, doctors, cases, files
src/lib/server/        server-only: Firebase Admin, payments, case assignment
firestore.rules        authoritative read/write authorization
storage.rules          authoritative medical-file authorization
```

A consultation moves `AWAITING_PAYMENT → IN_REVIEW → COMPLETED`. Only the server
may set `paymentStatus: PAID`, and assignment to a specialist runs in the same
transaction that records the payment.

### Security model

- Every document is owned by a Firebase Auth UID. `firestore.rules` and
  `storage.rules` are the real boundary; the client-side `RequireAuth` guard is
  UX only.
- Clients cannot claim payment, change a consultation's amount, grant themselves
  a role, or verify their own credentials. Payment is confirmed server-side
  against Razorpay and re-checked against the recorded order.
- Medical files are read through the authenticated SDK so every read is checked
  by `storage.rules`; they are never exposed through a public download URL.
- Firestore rules evaluation is capped at 1000 expressions per request, which
  bounds how much per-attachment validation the rules can do. See the comment
  above `fileAt` in `firestore.rules` before changing it, and re-run
  `npm run test:rules`, which covers the limit.

### Clinical AI

The AI endpoints are deliberately disabled: `/api/ai/triage` and
`/api/ai/summary` require an authenticated patient / verified specialist and
then return `503`, and the UI actions are hidden behind
`MEDICAL_AI_AVAILABLE` in `src/lib/features.ts`. Do not enable them until
case-specific patient consent, assigned-case authorization, provider retention
terms, quotas, and clinical review are implemented and tested. Flipping the UI
flag does not enable the server endpoints.

## Before going live

- Replace `src/app/(main)/privacy/page.tsx` and `terms/page.tsx` with copy
  reviewed by qualified legal counsel (DPDP Act 2023, Telemedicine Practice
  Guidelines 2020). Both pages carry a visible draft banner until then.
- Deploy the rules and indexes: `npx firebase deploy --only firestore,storage`.
- Register the Razorpay webhook (`POST /api/payments/webhook`,
  `payment.captured` and `order.paid`) and confirm `RAZORPAY_WEBHOOK_SECRET`
  matches.
- Create the first administrator by setting `role: "admin"` on that user's
  `users/{uid}` document with the Admin SDK; the rules do not let anyone
  self-assign the role.
- Wire `src/app/error.tsx` and `global-error.tsx` to an error tracker that never
  receives PHI.
