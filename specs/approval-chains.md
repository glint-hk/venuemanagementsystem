# SPEC: approval-chains — per-venue-type approval design

## Intent
Define the real approver order per venue type, sourced from stakeholder consultation, so `approval_chains` seed data and the routing engine (US-C2) reflect how IIML actually approves venue bookings.

## Inputs / Outputs
Input: stakeholder consultations with the Cultural Secretary, the Infrastructure Secretary, the Dance Club's Operations Coordinator, and a former Infrastructure Secretary.
Output: one `approval_chains` row per venue type, each with its ordered tiers and escalation window.

## Rules
- Each venue type maps to exactly one `approval_chains` row (`shared/entities.js` — `steps: Array<{ tier, role: 'APPROVER', escalationWindowHours }>`).
- Tiers are ordered lowest-first; tier 1 always acts before tier 2, etc. (enforced by US-C2).
- Estate-managed venues additionally require an Event Approval Document (EAD), submitted at least 15 days before the event, before a request enters the chain.
- Overlapping requests for the same venue and slot are resolved first-come-first-served by default. The chain's own approvers (or an Admin) may override FCFS in favor of a flagship institute event or an event involving an important guest; the override reason is recorded in the audit log.

## Edge cases that must be handled
- A venue type with no confirmed chain must block that venue type from being bookable (US-A4) rather than defaulting to an empty chain.
- Shared/multi-team venues (e.g. grounds) use the same chain as their venue type. Conflicts between competing requests for the same slot are resolved by the FCFS/override rule above, not a separate coordination workflow.

## Out of scope
The venue catalogue itself (`specs/venue-registry.md`). The routing engine that reads this data at runtime (US-C2). The chain-editing UI (US-C1). Escalation and delegation behavior (US-C3) — chains below carry an escalation window value for schema completeness, but no escalation or delegation logic is built against it in this iteration.

## Done when
Every venue type in `specs/venue-registry.md` has a matching row below, and `approval_chains` is seeded from this table.

---

## Approval chains by venue type

| Venue type | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Escalation window (hrs) |
|---|---|---|---|---|---|
| Estate-managed (Aryabhatta, GNB Circle, MV Circle, Samanjasya, Utsav, and other major event venues, including shared grounds) | Student Affairs Office | Student Affairs Chair | Dean (Infrastructure) | Director | 48 |
| Hostel common rooms / common spaces | Infrastructure Secretary | — | — | — | 48 |
| Academic classrooms | PGP Office | — | — | — | 48 |

Chains are stored as an ordered list of `{ tier, role: 'APPROVER', escalationWindowHours }` — the office names above are for seeding and reading the data; a step is addressed by tier number at runtime.

Users are assigned to a chain step via `users.approverTier` matching the step's `tier`.
