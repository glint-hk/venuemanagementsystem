# SPEC: US-C3 — Escalation & delegation

## Intent
A stalled approval (an approver who hasn't acted within their tier's window) needs to be flagged and escalated without ever silently approving itself, and an approver who's unavailable needs to be able to delegate their decisions to someone else.

## Inputs / Outputs
Input: a scheduled sweep (no external input) for escalation; `DelegationRequest` (delegateId, startAt, endAt) for delegation.
Output: escalation — a flag on the stalled step + `notification_outbox` rows to the next tier and Admin; delegation — a `delegations` row; at decision time, the resolved effective approver.

## Rules
- The escalation sweep runs on a schedule (matches the `server/src/lib/scheduler.js` pattern) and checks every `Pending` booking's current step against its `escalationWindowHours`.
- Escalation NEVER changes booking status and NEVER auto-approves — it only flags the step and notifies; the booking stays `Pending` until a human decides.
- Delegation resolves the EFFECTIVE approver at DECISION TIME, not at booking creation or delegation creation — a delegation created today applies to a booking created yesterday, as long as it's active when the decision is made.
- All escalation/delegation notifications are written to `notification_outbox` only; this code never calls the mailer directly.
- Escalation and delegation compose: if a step's approver has an active delegation AND the step has escalated, the notification goes to the delegate (as effective actor) AND still copies the next tier + Admin per the escalation rule — the two rules don't cancel each other out.

## Edge cases that must be handled
- A step escalates, then the original approver acts anyway before anyone else does → the decision is accepted normally; escalation flags don't lock anyone out.
- A delegation's `startAt`/`endAt` window has expired by decision time → the original approver is the effective approver again, not the expired delegate.
- Two overlapping delegations for the same approver (delegated to two different people in overlapping windows) → rejected as invalid at creation time, not resolved arbitrarily at decision time.
- A step escalates a second time (the next tier also misses its own window) → escalates again to the tier after that + Admin, not silently stuck after the first escalation.

## Out of scope
The routing/decision logic itself (US-C2). The outbox delivery mechanism (US-C4 — this story only writes rows, never sends). Chain configuration (US-C1).

## Done when
`server/tests/escalation-delegation.test.js` passes — a stalled step gets flagged and produces outbox rows for the next tier; escalation does not change booking status; a delegated step is actionable by the substitute and refused for the original; the combined delegation-plus-escalation case behaves as specified — plus the eval rubric for Escalation & Delegation in the Verification & Review Playbook.

## Contract note
`shared/entities.js` has no field tracking whether a given step has already escalated — needed to avoid re-notifying on every sweep, and to know when to escalate to the *next* tier rather than the same one again. Flagging for Architect review: likely a small addition to the snapshot step shape, or a new tracking structure. Also, the "overlapping delegations are rejected at creation" rule above is an assumption, not sourced from any existing document — flag for confirmation.
