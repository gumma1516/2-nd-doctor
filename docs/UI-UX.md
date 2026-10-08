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
