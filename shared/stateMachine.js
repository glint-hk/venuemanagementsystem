// The booking state machine, as data — no logic, no functions that decide
// anything. A transition is legal if and only if it appears in this array.
// server/prisma enforces this map with a database trigger (see the P0-3
// migration) so no code path can bypass it; this file is the specification
// that trigger is built from, not a duplicate authority.
//
// Source: AGENTS.md "Booking state machine (authoritative)". README.md's
// diagram is a simplified illustration of the same map — if the two ever
// read as contradictory, AGENTS.md governs for this file.

import { BookingStatus } from "./enums.js";

export const transitions = Object.freeze([
  { from: BookingStatus.DRAFT, to: BookingStatus.PENDING, trigger: "submit" },
  { from: BookingStatus.PENDING, to: BookingStatus.APPROVED, trigger: "all tiers approve" },
  { from: BookingStatus.PENDING, to: BookingStatus.REJECTED, trigger: "any tier rejects" },
  { from: BookingStatus.PENDING, to: BookingStatus.CANCELLED, trigger: "booker cancels" },
  { from: BookingStatus.PENDING, to: BookingStatus.CANCELLED, trigger: "auto-expiry (scheduled job)" },
  { from: BookingStatus.PENDING, to: BookingStatus.MODIFIED, trigger: "booker/admin edits" },
  { from: BookingStatus.APPROVED, to: BookingStatus.MODIFIED, trigger: "booker/admin edits" },
  { from: BookingStatus.APPROVED, to: BookingStatus.COMPLETED, trigger: "timeslot elapses" },
  { from: BookingStatus.APPROVED, to: BookingStatus.CANCELLED, trigger: "booker/admin cancels" },
  { from: BookingStatus.MODIFIED, to: BookingStatus.PENDING, trigger: "re-approval, freshly snapshotted chain" },
]);

// Terminal states have zero outgoing rows in `transitions` above.
export const terminalStates = Object.freeze([
  BookingStatus.REJECTED,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
]);
