# Integration & Demo Runbook
## Final Two Days — Venue Booking System

> The last 48 hours are where three separately-built epics become one system. This
> is a runbook, not a playbook — follow it in order. Owner: Architect + the three
> Scrum Masters.

---

## Why this needs a runbook

Two weeks is too short for a big-bang integration at the very end, but the final
push still has a predictable shape: connect the seams, prove the whole journey
works, harden, rehearse. Done ad hoc, this is where projects lose their last day
to a mismatch nobody caught. Done as a checklist, it's calm.

If you've been doing the **daily** integration ritual (afternoon combined-suite
runs from day 6), most seams are already connected and these two days are
confirmation, not discovery. If you haven't — start now and expect surprises.

---

## Day 13 — Integration

### Morning: freeze and assemble

1. **Feature freeze on `main`.** No new features from here. New work goes to a
   branch and waits. Announce it in all three team channels.
2. **Confirm every team's own suite is green** on `main`. A team whose suite is
   red is not ready to integrate — fix that first, in isolation.
3. **Read `docs/blockers.md` one last time as a group.** Any open cross-team
   blocker gets resolved before the E2E test runs, because the E2E test will fail
   on it anyway — better to fix the cause than debug the symptom.

### Midday: the end-to-end test (INT-P1)

Run the single scenario that crosses all three epics. Use real API calls
throughout — no mocking another team's layer, because mocks hide exactly the
mismatches this test exists to find. The scenario must run start to finish:

- [ ] Sign in with an institutional account (Prodnova)
- [ ] Search venues, see real availability (Prodnova → Tarot Club)
- [ ] Submit a request; it lands as Pending with a snapshotted chain (Tarot Club → Sprint & Tonic)
- [ ] Routed to approver 1; they approve (Sprint & Tonic + Prodnova UI)
- [ ] Routed to approver 2; they approve; booking becomes Approved
- [ ] The outbox produced the correct email at each transition (Sprint & Tonic)
- [ ] The audit trail is complete and gapless (Sprint & Tonic)
- [ ] The public board shows the slot busy — WITHOUT revealing who booked it (Prodnova)

Every unchecked box is an integration seam that doesn't hold. Fix the seam, rerun
the whole scenario — not just the failed step, because fixes create new seams.

### Afternoon: seam-by-seam verification

For each cross-team seam, confirm both sides agree on the actual shapes (not the
assumed ones):

- [ ] Prodnova's approver UI ↔ Sprint & Tonic's routing endpoints
- [ ] Prodnova's booking form ↔ Tarot Club's booking lifecycle API
- [ ] Everyone ↔ the frozen contract in `shared/` (nothing diverged)

### End of Day 13: the five guarantees, live

Not from tests — run them by hand once, in front of each other, so everyone has
seen the load-bearing walls hold:

- [ ] Fire concurrent bookings on one slot → exactly one wins
- [ ] Roll back a booking transaction → zero outbox rows, zero emails
- [ ] Attempt to update `audit_log` → refused
- [ ] Call an admin endpoint as a Booker → 403
- [ ] Call the public endpoint → raw response contains no identity or purpose

---

## Day 14 — Hardening and demo

### Morning: hardening (INT-P2)

This is **not** a refactoring window. Fix only what verification flagged.

- [ ] Fix only bugs the tests/E2E surfaced. No new features. No refactors. No new
      dependencies.
- [ ] **Never weaken or skip a failing test to go green.** If it's red, the code
      is wrong.
- [ ] Seed realistic demo data — real IIML venue names from
      `specs/venue-registry.md`, plausible bookings, a couple of pending approvals
      to show live.
- [ ] Run the complete suite (all three teams + E2E) and confirm: zero failures,
      **zero skipped tests**.

### Midday: rehearse the demo path

Walk it end to end at least twice. Decide who drives and who narrates. The story
to tell mirrors the E2E scenario, because that's what proves the system:

1. **Public board** — anyone can check availability, no login, no private data shown.
2. **Booker** — signs in with their institute account, searches, requests a venue.
3. **The guarantee moment** — try to double-book the same slot; show it's refused
   at the database. This is your strongest single moment; land it clearly.
4. **Approver** — signs in, sees the pending request, approves with a comment.
5. **Second approver** — approves; booking is confirmed; emails fired at each step.
6. **Admin** — shows the utilization dashboard and the immutable audit trail.
7. **Modify** — change a booking; show it re-enters approval with a fresh chain.

### Have ready, in case you're asked

- **"How do you prevent double-booking?"** → the exclusion constraint; show the
  concurrent-request test. (Your best answer — rehearse it.)
- **"What if an approver never responds?"** → the 48-hour escalation + delegation.
- **"What if you edit the approval process mid-request?"** → snapshot isolation;
  in-flight bookings keep their original chain.
- **"How do you know an email was actually sent?"** → the transactional outbox;
  nothing is lost, nothing sent for a rolled-back booking.
- **"Is the audit log tamper-proof?"** → append-only, enforced by database grant,
  not convention.
- **"What was your role?"** → know your epic, your contribution, and one real
  challenge you hit and how you solved it.

### Before you present — final checklist

- [ ] The app runs cleanly from a fresh start (rehearse the cold-start, not just
      the already-warm state)
- [ ] Demo data is seeded and realistic
- [ ] Every presenter knows their segment and their backup answers
- [ ] A screen-recording of the working E2E flow exists as a fallback if the live
      demo hits a network/environment issue
- [ ] `CHANGE_MANAGEMENT.md` has a final entry; `docs/blockers.md` is clear

---

## If something breaks during the demo

- Stay calm; switch to the recorded fallback for that segment and narrate over it.
- Don't debug live in front of the room — note it, move on, return if time allows.
- The guarantees matter more than the polish. If the UI glitches but you can show
  double-booking is impossible and the audit trail is intact, the system's *thesis*
  still lands.

---

> **The point of these two days:** you built the right things separately; now prove
> they're one system. Generation was the easy part. What you demo is verification —
> that the whole thing holds together and does what you said it would.
