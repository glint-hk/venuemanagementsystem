# SPEC: US-B3 — Search, availability grid, booking form & My Bookings

## Intent
A Booker needs to find an available venue and submit, track, modify, and cancel their own booking requests entirely through the UI — calling the real US-A2/US-A3 APIs, never simulating any of it with mock data or client-side logic.

## Inputs / Outputs
Input: search filters (venue type, capacity, attributes, date/time range) against US-A3's registry endpoint; `CreateBookingRequest` / `ModifyBookingRequest` against US-A2's booking endpoints.
Output: a rendered search/results grid, a submitted booking, and a "My Bookings" list reflecting live server state — no client-side state that can drift from the server.

## Rules
- The availability grid reflects real data from the US-A3 API — never mock or client-generated data.
- Every data view (search results, My Bookings) handles loading, empty, and error states explicitly — a screen that only handles the happy path is not done.
- A `409` (slot conflict) from create/modify renders as a clear, human-readable message — never a raw error dump or a silent failure.
- Modifying a booking warns the user, before they submit, that changing date, time, or venue re-triggers approval (per US-A2) — required, not optional polish.
- Booking status is never constructed or inferred client-side; the UI only ever displays the `status` the API returned, and calls the API for every transition (submit, modify, cancel).
- If a field or endpoint this story needs doesn't exist in `shared/` or in US-A2/US-A3's contract, that's raised for Architect review — never worked around with a client-only guess.

## Edge cases that must be handled
- Submitting a request for a slot that becomes occupied between page load and submit → the `409` path above is authoritative; no client-side conflict pre-check is trusted on its own.
- A search with filters matching zero venues → renders the empty state, not an error.
- The registry or booking API is unreachable → renders the error state, never a blank or infinitely-loading screen.
- Cancelling a booking updates My Bookings immediately, without requiring a manual page refresh.

## Out of scope
Server-side booking lifecycle rules (US-A2). Venue registry query logic (US-A3). The approver's own review screen (US-B4).

## Done when
`tests/search-and-booking.test.js` passes — a valid request submits; an occupied-slot request shows a clear conflict message; cancelling frees the slot in the UI; modifying returns the booking to `Pending` with the warning shown — plus the eval rubric for Search & Booking in the Verification & Review Playbook.

## Contract note
Depends on the same `VenueDTO`/search-query shape gap flagged in US-A3 — this story can't be fully specified against the contract until that's resolved.
