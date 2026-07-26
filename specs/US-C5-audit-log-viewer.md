# SPEC: US-C5 — Immutable audit log & viewer

## Intent
Every booking and approval action needs a permanent, tamper-proof record, and an Admin needs a read-only way to inspect it.

## Inputs / Outputs
Input: an `audit_log` write (entityType, entityId, action, actorId, metadata) issued by every producing code path, in the same transaction as the event; an Admin's read/filter query for the viewer.
Output: one `audit_log` row per event; a read-only, filterable list in the viewer for Admin.

## Rules
- Every `audit_log` write happens in the SAME transaction as the event it records — an event that commits without its audit row is a bug, not an acceptable edge case.
- `audit_log` is append-only. No code path ever issues `UPDATE` or `DELETE` against it — enforced both in application code and, already, at the database level (`app_user` has no `UPDATE`/`DELETE` grant on this table — see `server/prisma/migrations/*_add_concurrency_guarantee`).
- The viewer is read-only and Admin-only, enforced server-side, and exposes no endpoint or UI action that could mutate a record, even indirectly.
- `metadata` on each row captures enough detail to reconstruct what changed (e.g. before/after values), not just that something happened.

## Edge cases that must be handled
- A rolled-back transaction (e.g. a booking create that hits the exclusion constraint) → produces zero audit rows for that attempt, same as it produces zero outbox rows.
- A non-admin (including an Approver) calls the viewer's read endpoint directly → refused `403`.
- A high-volume system actor (e.g. the escalation cron sweeping many bookings) → each affected booking still gets its own row; the sweep is never compressed into one summary row that would lose per-booking traceability.
- A system/cron action with no human actor → `actorId` is `null`, never a fabricated system-user id.

## Out of scope
The exact `action` strings and `metadata` shape per producing story (defined by each: US-A2, US-A4, US-B2, US-C1, US-C2, US-C3). The database-level immutability grant itself is already built (P0-3 migration) — this story is the application-level write discipline plus the viewer.

## Done when
`server/tests/audit-log.test.js` passes — every booking/approval action produces exactly one audit row; a rolled-back action produces zero; a non-admin is refused on the viewer endpoint; the viewer offers no way to alter a record — plus the eval rubric for Audit Log & Viewer in the Verification & Review Playbook.
