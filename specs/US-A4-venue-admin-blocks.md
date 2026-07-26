# SPEC: US-A4 — Admin venue & date-block management

## Intent
An Admin needs to create/edit venues and block off date ranges (maintenance, holidays), so the registry stays accurate and no new booking can land on an unavailable window.

## Inputs / Outputs
Input: a venue create/edit payload (name, type, location, capacity, attributes, approval-chain assignment); a `venue_blocks` create/delete payload (venueId, startAt, endAt, recurring, reason).
Output: updated `venues` / `venue_blocks` rows; one `audit_log` row per write.

## Rules
- Only Admin may write venues or venue blocks — enforced in middleware, never by hiding the button in the UI.
- A venue must reference a valid, existing `approval_chains` row for its `type`; creating a venue for a type with no configured chain is refused, not silently allowed.
- Creating a `venue_blocks` row that overlaps an already-active booking does not cancel that booking — it blocks future requests for the window only.
- A blocked date range must make the venue genuinely unbookable for that window, verified by the database (a booking attempt inside it must fail), not just by the UI declining to show it as available.
- Every venue/venue-block write produces exactly one `audit_log` row.

## Edge cases that must be handled
- Deleting a `venue_blocks` row after it has already elapsed → allowed, has no effect on the past, still audit-logged.
- Two Admins editing the same venue concurrently → last write wins at the row level; both writes are audit-logged, so the sequence is reconstructable even though the earlier data is overwritten.
- A non-admin (including an Approver) calling any venue/venue-block write endpoint directly → refused `403`, verified by calling the endpoint directly rather than through the UI.
- Blocking a window that already contains active bookings vs. one that doesn't → both succeed identically per the no-retroactive-cancel rule above.

## Out of scope
Read/search API (US-A3). Approval chain configuration, a different entity (US-C1). Utilization metrics (US-A5).

## Done when
`server/tests/venue-admin.test.js` passes — a non-admin is refused `403` on write endpoints; a blocked date range rejects booking attempts inside it; every write produces an audit row — plus the eval rubric for Venue Admin in the Verification & Review Playbook.

## Contract note
The same `VenueDTO`/create-request shape gap flagged in US-A3 applies here for the write side too — `CreateVenueRequest` and `CreateVenueBlockRequest` don't exist in `shared/contracts.js` yet.
