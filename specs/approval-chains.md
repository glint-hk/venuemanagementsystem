# SPEC: approval-chains — per-venue-type approval design (data-gathering)

> Not a feature spec. This captures the real approval hierarchy per venue
> type before US-C1 (configurable chains) and US-C3 (escalation/delegation)
> are built. TODO items must come from stakeholder input — never guessed.

## Intent
Give Team 3 (and Team 1, who seeds `approval_chains`) the real, stakeholder-confirmed approver order, escalation window, and delegation rules for every venue type, so seeded chain data reflects how IIML actually approves bookings.

## Inputs / Outputs
Input: interviews with the Registrar's office and whoever currently approves venue requests today.
Output: one completed row per venue type below (matching `venues.type` in `specs/venue-registry.md`), each with its ordered approver tiers, escalation window, and delegation policy.

## Rules
- Each venue type maps to exactly one `approval_chains` row (`shared/entities.js` — `steps: Array<{ tier, role: 'APPROVER', escalationWindowHours }>`).
- Tiers are ordered lowest-first; tier 1 always acts before tier 2, etc. (enforced by US-C2, defined here).
- Every tier's `escalationWindowHours` must be a real, confirmed number — not a round-number guess.
- Grounds / multi-team spaces must state explicitly whether they use plain sequential approval or the multi-team coordination workflow noted below.

## Edge cases that must be handled
- **Multi-team scheduling conflicts on shared grounds**: TODO — confirm with stakeholders whether this is a variant of sequential approval (e.g. an added coordination tier) or a genuinely different, non-approval workflow. Do not assume; this changes what US-C1/US-C2 need to support.
- **A venue type with no confirmed chain yet**: must block that venue type from being bookable (US-A4) rather than defaulting to an empty or assumed chain.
- **Per-tier delegation rules that differ** (e.g. tier 1 allows delegation, tier 2 requires a named backup): capture per-tier, not as one blanket policy, if that's how it actually works.

## Out of scope
The venue catalogue itself (`specs/venue-registry.md`). The routing engine that reads this data at runtime (US-C2, already specced). The chain-editing UI (US-C1).

## Done when
Every venue type used in `specs/venue-registry.md` has a matching row below with no remaining TODO, the multi-team coordination question is resolved (not just flagged), and the Architect has reviewed it before `approval_chains` is seeded.

---

## TODO: Approval chains by venue type

| Venue type | Tier 1 role | Tier 2 role | Tier N... | Escalation window (hrs) | Delegation rules | Multi-team coordination needed? |
|---|---|---|---|---|---|---|
| TODO | TODO | TODO | TODO | TODO | TODO | TODO |

*(Add one row per venue type. Leave every cell as TODO until stakeholder-confirmed.)*
