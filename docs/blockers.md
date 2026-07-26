# Blockers Log

> The three Scrum Masters and the Architect read this every morning. Anything
> blocking a cross-team seam gets resolved first, before individual work resumes.
> Add a row when blocked; move it to Resolved when cleared.

## The one question that matters daily
**Has anyone changed a shape another team depends on?** If yes, notify that team
the SAME DAY. A silent contract change found three days later is the most
expensive failure available to us.

## Active blockers

| Date | Team | Blocked on | Owner | Notes |
|---|---|---|---|---|
| | | | | |

## Resolved

| Date raised | Date cleared | Team | What it was | How it cleared |
|---|---|---|---|---|
| | | | | |

## Cross-team seams to watch

- Prodnova's approver UI (T2-P6) consumes Sprint & Tonic's routing endpoints (T3-P3).
- Prodnova's booking form (T2-P5) hits Tarot Club's booking lifecycle API (T1-P2).
- All teams depend on the frozen contract in `shared/` (P0-2).
- Critical path: P0-2 (contract) blocks everyone; T3-P3 (routing) blocks T2-P6.
