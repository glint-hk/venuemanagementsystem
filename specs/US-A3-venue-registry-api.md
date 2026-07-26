# SPEC: US-A3 — Venue registry API

## Intent
Bookers, Approvers, and Admins need to search the venue registry and check real availability, so they can find and select a space before requesting a booking.

## Inputs / Outputs
Input: optional filters — venue type, capacity, attributes, and a date/time range to check availability against.
Output: a list of venue records matching the filters, each with availability computed against active bookings and venue blocks for the requested window.

## Rules
- Read-only story: no venue creation or editing here (see US-A4).
- A venue is unavailable for a window if it has an overlapping active booking (`Pending`/`Approved`/`Modified` — the same set the exclusion constraint scopes) OR an overlapping `venue_blocks` row.
- Filters are applied server-side, in the query — never fetched-all-then-filtered client-side.
- This endpoint requires authentication. It is not the anonymous public endpoint (see US-B5, a separate, narrower endpoint).

## Edge cases that must be handled
- A venue with an active recurring `venue_blocks` row covering the requested window → reported unavailable, identical to an active booking.
- A filter combination matching zero venues → returns an empty list, not an error.
- An unauthenticated request to this endpoint → refused; this is a different endpoint from the public board and must not be reachable without a session.

## Out of scope
Venue creation, editing, and date-blocking (US-A4). The anonymous public busy/free board (US-B5). Booking creation itself (US-A2).

## Done when
`server/tests/venue-registry.test.js` passes — filters narrow results correctly; availability reflects both bookings and blocks; an unauthenticated request is refused — plus the eval rubric for Venue Registry in the Verification & Review Playbook.

## Contract note
`shared/contracts.js` has no `VenueDTO` or search-query shape yet. This story and US-B3 both need one — flagging for Architect review rather than inventing it here.
