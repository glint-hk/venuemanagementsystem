# SPEC: US-B2 — Auto-registration & role elevation

## Intent
New users need a working account the instant they first sign in, with no manual provisioning step, while role changes stay tightly controlled so nobody can grant themselves access they weren't given.

## Inputs / Outputs
Input: a first successful SSO sign-in (from US-B1) for a new email; separately, an Admin's `RoleElevationRequest` for an existing user.
Output: a new `users` row with `role: BOOKER` on first sign-in; an updated role (and `approverTier`, if elevating to `APPROVER`) on a successful elevation; one `audit_log` row per elevation.

## Rules
- Every new user is created with `role: BOOKER` — the lowest-privilege role — with no parameter that can override this at sign-in time.
- Role elevation is Admin-only, enforced server-side in middleware, and is never exposed to a Booker or Approver by any endpoint.
- There is no self-elevation path anywhere — not a query param, not a first-user bootstrap endpoint. The very first Admin account is created directly by the seed migration, never through the running application.
- Elevating a user to `APPROVER` requires setting `approverTier`; elevating to any other role clears it.
- Every role change writes an `audit_log` row recording the actor (the Admin who made the change) and the before/after role.

## Edge cases that must be handled
- A user signs in a second time after already existing → no duplicate row, no role reset; the existing role is preserved.
- A Booker calls the elevation endpoint directly (bypassing the UI) → refused `403`.
- An Admin elevates a user to `APPROVER` without providing `approverTier` → the request is rejected as invalid, never silently defaulted to a tier.
- An Admin demotes another Admin → allowed, no special protection against de-adminning someone, but audit-logged like any other change so it stays traceable.

## Out of scope
The sign-in flow itself (US-B1). The admin UI screen layout for browsing/elevating users (client concern, not this spec's contract).

## Done when
`server/tests/auto-registration.test.js` passes — first sign-in creates a Booker; a Booker calling the elevation endpoint is refused `403`; an Admin can elevate successfully; every elevation writes an `audit_log` row — plus the eval rubric for Auto-Registration & Role Elevation in the Verification & Review Playbook.
