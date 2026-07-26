# SPEC: US-C1 — Configurable approval chains

## Intent
An Admin needs to configure the ordered approver chain per venue type as data, so adding or changing an approval tier never requires a code change or a deploy.

## Inputs / Outputs
Input: `ApprovalChainConfigRequest` (venueType, steps: ordered tier/role/escalationWindowHours).
Output: a new `approval_chains` row version for that venue type; one `audit_log` row; existing in-flight bookings are untouched.

## Rules
- Chains are DATA, stored in `approval_chains` — never a code path with tier logic hardcoded per venue type.
- Chain configuration is Admin-only, enforced server-side.
- Editing a chain increments its `version` (`shared/entities.js`); it does NOT rewrite any booking's `approvalChainSnapshot`. The write path must not touch `bookings` or `approvals` at all.
- A venue's `approvalChainId` keeps pointing at the same `approval_chains` row; the row's `steps`/`version` change in place. It is the SNAPSHOT taken at booking creation (US-C2) that protects in-flight bookings — this story's job is only to make the live config change cleanly.

## Edge cases that must be handled
- A chain is edited while a booking under the old version is `Pending` → per US-C2, that booking keeps following its snapshot. This story's own test proves the *edit* endpoint itself never reaches into `bookings`.
- A new chain config with zero steps → rejected as invalid; a venue type must always resolve to at least one approval tier.
- A non-admin (including an Approver) calls this endpoint directly → refused `403`.

## Out of scope
The routing engine that reads the snapshot at decision time (US-C2, already specced). The escalation window's runtime behavior (US-C3 — this story only stores the number). Venue-to-venue-type mapping (US-A4).

## Done when
`server/tests/approval-chains-config.test.js` passes — the required proof: create a booking under chain v1, edit the chain, and show the in-flight booking still follows the ORIGINAL sequence while a new booking follows the edited one — plus the eval rubric for Configurable Approval Chains in the Verification & Review Playbook.
