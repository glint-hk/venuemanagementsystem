# SPEC: US-C2 — Sequential approval routing

> This is a worked example. Use it as the reference for how much detail a spec
> needs. It is the hardest story in the project, which is why its spec is the
> most thorough.

## Intent
A booking request must be routed to approvers in the configured order for its
venue type, one step at a time, until all approve or any rejects.

## Inputs / Outputs
Input: `booking_id`, approver user, decision (`approve` | `reject`), optional comment.
Output: updated booking status, next approver notified (via outbox), audit row.

## Rules
- On booking creation, the approval chain for the venue type is SNAPSHOTTED into
  the booking's approval steps. All routing reads this snapshot, never live config.
- Only the approver matching the LOWEST undecided step may act. Enforced server-side.
- Approve on the last step → booking becomes `Approved`.
- Approve on a non-last step → advance to the next step, notify that approver.
- Reject at any step → booking `Rejected`, all remaining steps voided, slot
  released immediately.
- Every decision writes an `audit_log` row and (where a notification is due) a
  `notification_outbox` row, in the same transaction as the status change.
- Notifications are written to the outbox only. This code NEVER calls the mailer.

## Edge cases that must be handled
- **Chain edited mid-request:** the snapshot governs; live config is ignored. A
  booking created under chain v1 keeps following v1 even after the chain is edited.
- **Approver unavailable > 48h:** the escalation job flags the step and notifies
  the next tier + Admin. Escalation NEVER auto-approves.
- **Delegation active:** the effective approver is resolved at decision time, so a
  delegation set today applies to a booking created yesterday.
- **Duplicate / concurrent decisions on the same step:** exactly one is recorded;
  the second is refused cleanly.
- **Out-of-order action:** an approver whose step is not the current lowest
  undecided step is refused.

## Out of scope
Email content and templates (US-C4). The approver UI screen (Prodnova / Team 2).
Chain configuration UI (US-C1).

## Done when
All tests in `server/tests/approval-routing.test.js` pass, AND the eval Rubric A
(Approval routing) in the Verification & Review Playbook scores pass on all items.
