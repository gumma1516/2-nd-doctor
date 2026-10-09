# SecondCare UI and UX refresh

The interface now uses an ink-dark foundation with mint primary actions, lavender secondary accents, restrained translucent panels, and specular highlights. Typography uses self-hosted Geist Sans and Geist Mono with their OFL license included.

## Design references reviewed on 8 October 2026

- [Linear](https://linear.app/): dark surfaces, focused hierarchy, and product previews.
- [Apple materials guidance](https://developer.apple.com/design/human-interface-guidelines/materials): restrained glass, content legibility, and reduced transparency support.
- [Vercel Geist](https://vercel.com/font) and [typography](https://vercel.com/geist/typography): clear sans typography and deliberate hierarchy.
- [web.dev accessibility](https://web.dev/learn/design/accessibility): logical keyboard order and reduced motion.

These are design references, not endorsements or evidence of clinical quality.

## Updated experience

- Asymmetric landing page with an explicitly labeled workspace preview, specialty cards, a three-step explanation, transparent pricing, and accessible native FAQ disclosures.
- Responsive navigation with a mobile menu, Escape handling, account controls, and a skip link.
- Patient and doctor account selection and consistent passwordless email / Google sign-in screens.
- Registration, profile, medical-record upload, consultation, checkout, patient dashboard, specialist workspace, account settings, admin workspace, and legal-page styling.
- Consultation progress, readable report controls, loading placeholders, clear empty states, payment states, and completed written opinions.
- Animated aurora background, restrained hover / entry transitions, CSS reduced-motion and reduced-transparency fallbacks, and visible server-rendered content when JavaScript is unavailable.
- Loading buttons retain their labels and dimensions. Form errors connect to controls, invalid email submission focuses the email field, and upload removal controls have larger touch targets.
- Fixed the existing audit-service type error and the sign-in retry screen's ref reads during render.

## Validation

Production build, including TypeScript and generation of all 33 routes: passed.
ESLint for src: passed.
Existing authentication / account tests: 8 passed.
Desktop and mobile public-page visual and interaction checks performed in the local browser. Screenshots are in docs/design.

Protected clinical workflows require authenticated accounts and configured services for an end-to-end browser check. The Firebase assignment/rules integration suites require the Firebase emulators; Java is currently unavailable on PATH, so those suites have not been verified here.

## Clinical AI status

The existing AI endpoints previously accepted medical text without authentication. They now require authenticated patient / verified specialist access and return an unavailable response. Unauthenticated HTTP checks confirmed both endpoints return 401. Their UI actions are disabled through src/lib/features.ts. The provider helper code is retained in src/lib/server/medical-ai-drafts.ts and is not reachable from a route.

Do not enable the AI UI until case-specific patient consent, assigned-case authorization, provider retention terms, quotas, and clinical review have been implemented and tested. Changing the UI feature flag does not enable the server endpoints.

---

# Production-readiness pass, 9 October 2026

## Defects found and fixed

**Patients could attach at most two medical reports.** Firestore caps rules
evaluation at 1000 expressions per request, and rules functions are inlined, so
every reference to `files[i]` re-evaluated the argument. The twenty unrolled
`fileAt` calls plus the twenty-term total-size sum exceeded the cap, and
Firestore denied the write — on a product that advertises twenty files. Measured
on the emulator: three attachments already failed. The per-attachment check is
now two references (exact key bound plus an owner-scoped path with an allowed
extension), reports are attached by an update rather than at create time, and
the duplicate `diff()` in the patient branch is gone. Twenty attachments, and
five doctor credentials, now commit with headroom. Byte size and content type
were always enforced where the bytes are (`storage.rules`) and re-verified
against Storage metadata at checkout; `hasOnly` bounds the key set but permits a
subset, so the checkout path now rejects an attachment missing its metadata
explicitly, and the UI falls back to the storage path.

**Local development against the Firebase emulators was impossible.** The CSP in
`next.config.ts` allowed only `https://*.googleapis.com` and friends on
`connect-src`, so every emulator call (`http://127.0.0.1:9099`, `:8080`, `:9199`)
was refused by the browser: sign-in failed with `auth/network-request-failed`.
The development policy now allows loopback origins; the production policy is
unchanged. `allowedDevOrigins` was added for the same reason — `next dev` blocked
its own HMR resources over `127.0.0.1`, which left pages unhydrated.

**The case-assignment suite had never run.** It failed at import
(`process is not defined`) because the modules were compiled into a bare
`vm` context, and then on `instanceof Promise`, which is realm-sensitive, so
firebase-admin rejected every transaction callback. Compiling in the main realm
fixes both; all nine assignment and rotation tests pass.

**`npm run lint` failed** with nine errors in `tests/`, so the previous pass could
only report ESLint over `src`. Node test suites and maintenance scripts now have
their own override, and lint is clean across the repository.

**The file dropzone could open two file choosers.** The hidden input sat inside
the clickable region, so the programmatic click bubbled back into the handler
that issued it. It now sits outside; verified in the browser as exactly one
chooser per click.

**Other fixes.** `error.tsx` used `reset()`, which re-renders without re-fetching,
where this Next version's `retry()` actually recovers. A failed doctor
application was rendered as a validation error under the declaration checkbox,
behind a "fix the highlighted fields" banner. Both auth buttons showed a spinner
whichever was clicked. `.env.example` listed none of the variables the app
requires, so a fresh clone could not start. The unused `src/lib/mock-db.ts`
wrote a conflicting schema to collections the rules deny. The AI stubs called
their own authenticated endpoints without a bearer token.

## Interface and experience

- Signed-in users on a phone had no way to sign out: the control was
  `hidden sm:flex` and the mobile menu offered only account settings. The menu
  now carries dashboard, account settings and sign out, and the admin sidebar
  shows its own control.
- `error.tsx`, `not-found.tsx` and the account-type chooser used raw
  `bg-brand-600` / `bg-teal-600` buttons outside the design system; all three now
  use the shared surfaces. A `global-error.tsx` covers failures in the root
  layout, with inline styles in case the stylesheet is part of the failure.
- A specialty chosen on the landing page is carried through sign-in and
  preselected in the consultation form. Each specialty has its own icon; four
  previously shared two.
- Profile validation reports which field is wrong, marks it invalid and focuses
  it, instead of one banner for every mistake.
- Private file lists show sizes and fall back to the storage path when display
  metadata is absent. The dropzone shows remaining capacity rather than only
  what is selected. Storage object names are now `{uuid}.{ext}`, keeping
  user-supplied characters out of paths.
- Authenticated workspaces carry their own titles and `noindex`; `/auth/*` is
  noindexed and excluded from robots. The doctor declaration no longer promises
  AI decision support the product does not offer. Form labels and spelling were
  made consistent.

## Validation

ESLint across the repository, `tsc --noEmit`, and the production build (33
routes): passed. Account tests: 8 passed. Firestore/Storage rules: 10 passed, 2
skipped. Assignment and rotation: 9 passed.

Browser checks against Chromium at 1440×950 and 390×844: no horizontal overflow
and no console errors on the public pages. End to end against the emulators —
email-link sign-in, onboarding validation and focus, patient dashboard, the
signed-in mobile menu, specialty preselection, and one file chooser per
dropzone click: 8 of 8 passed.

The two skipped rules cases cover Cloud Storage reads and uploads. The Storage
emulator does not evaluate cross-service `firestore.*` rules and denies every
such rule, which is why those cases previously failed rather than passing; the
suite now probes for the capability and skips them with the reason. Those rules
still apply in production — verify them against a staging bucket before launch.
