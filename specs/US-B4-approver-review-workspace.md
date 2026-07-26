# SPEC: US-B4 — Approver review workspace

## Intent
An Approver needs to see exactly the requests currently awaiting their decision — and only those — and record an approve/reject decision with a comment where required.

## Inputs / Outputs
Input: the signed-in approver's identity (from session); `ApprovalDecisionRequest` (decision, comment) per booking.
Output: a list of bookings where this approver is the current step; an updated booking/approval state after a decision, via US-C2's routing endpoint.

## Rules
- The pending-request list contains only bookings where the signed-in approver matches the CURRENT undecided step — filtered server-side, never fetched-all-then-filtered in the browser.
- Rejecting a request requires a comment; approving may leave it optional (matches US-C2).
- The UI never decides who acts next or what the next status is — it only calls US-C2's decision endpoint and renders whatever it returns.
- An approver whose step is not yet current sees nothing for that booking — not a disabled row, it simply isn't in their list.

## Edge cases that must be handled
- Approver A approves their step → approver B's list includes the booking on B's next fetch, without B needing to do anything else.
- A delegate acting on behalf of a delegating approver (US-C3) sees the same filtered list as if they were the original approver for that step.
- Two tabs open for the same approver, one decides the booking → the other tab's stale view must not allow a duplicate submission to appear to succeed; US-C2's "lowest undecided step" rule is what actually prevents it, the UI just needs to surface the resulting error cleanly.
- Rejecting without a comment → blocked client-side for immediate feedback, but the server also enforces it; client-side validation is UX only, never the authority.

## Out of scope
The routing/decision logic itself (US-C2). Escalation and delegation logic (US-C3). Booking creation (US-A2/US-B3).

## Done when
`tests/approver-workspace.test.js` passes — approver A sees only their step; approver B sees nothing until A approves; rejection without a comment is blocked; B's list updates after A approves — plus the eval rubric for Approver Review Workspace in the Verification & Review Playbook.

## Contract note
`BookingDTO` alone doesn't tell a client whether a booking is currently the caller's to act on — it has `currentStepIndex` but not the resolved role/tier at that step, or the effective approver after delegation. Flagging for Architect review: either the list endpoint needs an explicit assigned-approval response shape, or it's defined as "server pre-filters, so the DTO doesn't need to explain why."
