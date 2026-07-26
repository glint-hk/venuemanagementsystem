# SPEC: US-B6 — Mobile-responsive admin overview

## Intent
An Admin checking status from a phone needs the same venue/booking overview available on desktop, laid out so it's actually usable on a small screen.

## Inputs / Outputs
Input: the same Admin-facing data as the desktop venue/booking admin views (US-A4 and related).
Output: the same data, responsively laid out at mobile, tablet, and desktop widths.

## Rules
- This story adds responsive layout only — no new data, endpoint, or permission beyond what US-A4 (and other admin views) already expose.
- Responsive changes must not break the existing desktop layout — both must be verified, not just the new mobile view.
- All existing server-side authorization (Admin-only) applies unchanged; this story is presentation-only.

## Edge cases that must be handled
- A very long venue name or list on a narrow screen → wraps or truncates predictably, never pushes other elements off-screen.
- Rotating a device between portrait/landscape mid-session → layout adapts without losing scroll position or in-progress form input.
- A tablet-width viewport (the awkward middle case) → resolves to one layout or the other cleanly, never a broken hybrid.

## Out of scope
Any new admin capability or data (US-A4 owns that). The public board's own mobile behavior (US-B5 — separate story, separate audience).

## Done when
`tests/mobile-admin.test.js` (or a documented visual/responsive check in the PR) shows the admin overview rendering correctly at mobile, tablet, and desktop widths with no desktop regression, plus the eval rubric for Mobile Admin Overview in the Verification & Review Playbook.
