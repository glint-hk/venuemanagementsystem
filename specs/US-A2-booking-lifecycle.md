# SPEC: US-A2 — Booking lifecycle (create/view/modify/cancel)

## Intent
A Booker needs to create, view, modify, and cancel their own venue booking requests, with every status change validated against the booking state machine and audit-logged.

## Inputs / Outputs
Input: `CreateBookingRequest` on create; `ModifyBookingRequest` on modify; `booking_id` + the caller's identity on view/cancel.
Output: a `BookingDTO` reflecting the new/updated status; one `audit_log` row per action; on modify, the booking re-enters `Pending` with a freshly snapshotted approval chain.

## Rules
- Create writes the booking directly into `Pending` (submitted immediately) — this story does not implement a separate saved-`Draft` state.
- Double-booking is prevented by the database exclusion constraint, never an application-level check. The controller catches the constraint's error and returns a clean `409`.
- Every status change goes through the state machine in `shared/`; no code path sets `status` directly.
- Modify re-triggers approval (`Approved`/`Pending` → `Modified` → `Pending` with a fresh snapshot) when date, time, OR venue changes. A purpose-only edit does not change booking status.
- Cancel releases the slot immediately (`Pending`/`Approved` → `Cancelled`, which is outside the exclusion constraint's active-status scope).
- Only the booking's own booker, or Admin, may view/modify/cancel it — enforced server-side.
- Every state change writes exactly one `audit_log` row, in the same transaction as the change.

## Edge cases that must be handled
- Modify on a booking that is already `Rejected`/`Completed`/`Cancelled` → refused, nothing to modify.
- Modify or cancel changing a slot/venue to one that's now occupied → the same `409` the create path returns; the exclusion constraint is the sole authority.
- Concurrent modify + final approval decision on the same booking → whichever operation finds the booking no longer in its expected prior status is refused cleanly, not silently overwritten.
- View by a user who is neither the booker, the current-step approver, nor Admin → refused (`403`); the booking is never leaked to unrelated users.

## Out of scope
Approval decisions themselves (US-C2). Auto-expiry of a stale `Pending` booking (US-C3). Venue registry data (US-A3). Client-side UI (US-B3).

## Done when
`server/tests/booking-lifecycle.test.js` passes — create succeeds; create on an occupied slot returns `409`; cancel frees the slot for immediate rebooking; modify moves the booking back to `Pending`; every action leaves exactly one `audit_log` row — plus the eval rubric for Booking Lifecycle in the Verification & Review Playbook.
