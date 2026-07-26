# SPEC: US-C4 — Notification outbox, delivery worker & email templates

## Intent
Every state change that should notify someone needs that notification to survive a crash, never send for a rolled-back transaction, and never be sent by more than one code path — with clear, correctly templated content.

## Inputs / Outputs
Input: `notification_outbox` rows written by producers (US-A2, US-C2, US-C3, etc.) inside their own transactions.
Output: sent emails via the mailer; `notification_outbox.status` updated to `SENT` or `FAILED`; content rendered from the matching template.

## Rules
- The delivery worker (`server/src/lib/outboxWorker.js`) is the SOLE code path permitted to call the mailer client — enforced by CI (`.github/scripts/check-mailer-imports.sh`), not just convention.
- The worker reads `PENDING` rows and sends only AFTER the producing transaction has committed — it runs as a separate, later step, never inside the same transaction as the state change.
- Delivery is idempotent: running the worker twice over the same row sends exactly one email, never two.
- A failed send stays retryable (not dropped) and retries with backoff.
- No log of a sent email includes the body's personal data in plaintext.
- Every template renders from `notification_outbox.payload` only — no hard-coded URL, name, or environment value inside a template.
- Every transition in `shared/stateMachine.js` that should notify someone has exactly one matching template — never zero, never more than one.

## Edge cases that must be handled
- A booking transaction that gets rolled back (e.g. the exclusion constraint fires) → produces ZERO `notification_outbox` rows; nothing was written because nothing committed.
- The mail provider is down when the worker runs → the row stays pending/retrying; the next run picks it up, no data loss.
- The worker crashes mid-send, after the provider accepted the email but before `status` was updated → the idempotency rule is what prevents a duplicate on the next run — not an assumption that this can't happen.
- A recipient lookup fails unexpectedly → that row is marked `FAILED` with a reason; it never throws an unhandled exception that stops the whole batch.

## Out of scope
What decisions produce a notification and their business rules (each producing story: US-A2, US-C2, US-C3). The mailer provider/SDK choice itself.

## Done when
`server/tests/notification-outbox.test.js` passes — a rolled-back transaction leaves zero outbox rows and sends nothing; a simulated provider failure leaves the row pending and retries with no duplicate on eventual success; running the worker twice over the same row sends exactly one email; every required template exists and renders with sample data — plus the eval rubric for Notification Outbox & Templates in the Verification & Review Playbook.
