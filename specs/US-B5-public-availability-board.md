# SPEC: US-B5 — Public availability board

## Intent
Anyone — no account, no login — needs to see which venues are busy or free for a given window, without ever learning who booked them or why.

## Inputs / Outputs
Input: an anonymous, unauthenticated HTTP request (venue and/or date range, optionally).
Output: `PublicAvailabilitySlotDTO[]` — `venueId`, `timeslot`, `busy`. Nothing else, ever.

## Rules
- The response shape is exactly `PublicAvailabilitySlotDTO` (`shared/contracts.js`) — no booker identity, no purpose, no approval detail, no field beyond `venueId`/`timeslot`/`busy`.
- This is enforced in the endpoint's own database query (only select the fields that shape allows), never by the client simply choosing not to render fields that are present in the response.
- The endpoint requires no authentication, and must NOT accept a session token as a way to get MORE data than an anonymous caller gets — a logged-in user hitting this endpoint sees exactly what an anonymous one sees.
- A slot counts as busy using the same active-status definition as the exclusion constraint (`Pending`/`Approved`/`Modified`) — a `Rejected` or `Cancelled` booking's old slot shows as free.

## Edge cases that must be handled
- A booking that is `Pending` (not yet `Approved`) → still shown as busy; the board reflects held slots, not just confirmed ones.
- The endpoint is called with a forged/expired/garbage `Authorization` header → still returns the same public-only shape; the header is ignored, never used to unlock more data.
- A venue with zero bookings in the requested window → every slot reports `busy: false`, not omitted from the response.

## Out of scope
The authenticated venue registry with full detail (US-A3). Booking creation, which requires auth (US-A2/US-B3).

## Done when
`tests/public-board.test.js` passes — calling the endpoint with no session and inspecting the RAW JSON shows no identity or purpose field whatsoever, at any nesting level — plus the eval rubric for Public Availability Board in the Verification & Review Playbook.
