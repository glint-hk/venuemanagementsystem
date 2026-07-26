# SPEC: US-A5 — Utilization dashboard & metrics

> The metric definitions below are an Architect-authored placeholder, not
> stakeholder-confirmed. Treat as a draft to be validated, not a fact.

## Intent
An Admin needs aggregate visibility into how venues are actually used — utilization rate, busiest venues/times, approval turnaround — to make registry and staffing decisions.

## Inputs / Outputs
Input: a reporting window (date range), optional venue or venue-type filter.
Output: aggregate metrics computed server-side over `bookings` and `venues` for the window.

## Rules
- **Utilization rate** per venue = booked hours ÷ available hours in the window (available hours excludes `venue_blocks` time).
- **Booking volume** per venue and per venue type = count of `Approved`/`Completed` bookings in the window.
- **Approval turnaround** = mean time from a booking's `createdAt` to its terminal `Approved`/`Rejected` `updatedAt`, grouped by venue type.
- **Peak demand windows** = the hour-of-day / day-of-week buckets with the most REQUESTED bookings (all statuses, not just approved — a rejected request still signals demand).
- Only `Approved`/`Completed` bookings count toward utilization and volume; `Pending`/`Rejected`/`Cancelled` never occupied the slot (or didn't end up occupying it).
- Dashboard data is Admin-only, enforced server-side.
- Aggregation happens in the database (SQL aggregate queries), never by pulling all bookings into memory and reducing in application code.

## Edge cases that must be handled
- A venue with zero bookings in the window → reports 0% utilization, not an error or a missing row.
- A still-`Pending` booking in the window → excluded from utilization/volume (its outcome is unknown) but still counted toward peak demand.
- A venue deleted after having historical bookings → historical metrics still include it; do not silently drop rows on a missing live venue join.

## Out of scope
Real-time availability (US-A3). Venue/venue-block management (US-A4). Any export/reporting format beyond the dashboard view itself.

## Done when
`server/tests/utilization-metrics.test.js` passes — seed a dataset where every metric can be computed by hand, and the endpoint output matches those hand-computed values exactly — plus the eval rubric for Utilization Metrics in the Verification & Review Playbook.

## Contract note
The four metric formulas above need Analyst/PO (stakeholder) confirmation before being frozen — flag for review, don't build silently against them. No `UtilizationMetricsDTO` response shape exists in `shared/contracts.js` yet either.
