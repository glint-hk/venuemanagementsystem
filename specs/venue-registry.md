# SPEC: venue-registry — IIML venue catalogue (data-gathering)

> Not a feature spec. This file exists so the real IIML space catalogue is
> captured once, in the shape US-A3/US-A4/US-C1 all depend on, before those
> stories are built. TODO items must be filled from stakeholder input
> (PGP Office / Estate Office) — never guessed.

## Intent
Give Team 1 a single, reviewed source of every bookable IIML space, so the seed data, the registry API, and the venue-type-to-approval-chain mapping are built from real facts, not invented ones.

## Inputs / Outputs
Input: interviews with the PGP Office and Estate Office; a physical walk of campus spaces.
Output: one completed row per bookable venue in the table below — no row may reach `server/prisma/seed.js` with a placeholder still in it.

## Rules
- Every venue needs: name, type, location, capacity, attributes (projector, sound system, AC, etc.), and the approval-chain venue-type it maps to.
- A venue's `type` here must be spelled identically to a `venueType` in `specs/approval-chains.md` — a mismatch means the venue silently has no approval chain.
- Do not invent a venue, a capacity, or an attribute. An unconfirmed value stays marked TODO rather than being filled with a guess.

## Edge cases that must be handled
- **Shared / multi-team spaces** (e.g. grounds, the amphitheater): note explicitly if a space needs the multi-team coordination workflow referenced in `specs/approval-chains.md` rather than plain sequential approval.
- **Partitionable spaces** (a hall that splits into smaller rooms): decide and note whether each configuration is a separate venue row or one venue with a variable capacity.
- **Seasonal / temporary spaces**: flag any venue that isn't bookable year-round.

## Out of scope
Approval chain design itself (`specs/approval-chains.md`). The registry API (US-A3) and admin UI (US-A4), which consume this data once it exists.

## Done when
Every row below has no remaining TODO, Analyst 1 and Analyst 2 have both reviewed it against the physical campus, and the Architect has reviewed it before `server/prisma/seed.js` is written against it.

---

## TODO: Venue catalogue

| Name | Type | Location | Capacity | Attributes | Approval chain (venueType) | Notes |
|---|---|---|---|---|---|---|
| TODO | TODO | TODO | TODO | TODO | TODO | TODO |

*(Add one row per space. Leave every cell as TODO until confirmed — do not fill with a guess.)*
