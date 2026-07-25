# Venue Booking System — Complete Prompt Playbook
## Agentic Engineering, 2-Week Delivery, 3 Teams

**Team 1 — Tarot Club** · Epic A: Data Core & Admin Console (42.7h, 6 members)
**Team 2 — Prodnova** · Epic B: Identity & Stakeholder Experience (49h, 7 members)
**Team 3 — Sprint & Tonic** · Epic C: Approval Engine & Notifications (35h, 5 members)
**Architect** · Harness, contract, schema, integration (14h)

---

## How To Use This Document

Every prompt below follows the same six-block structure. Do not shorten it — the blocks exist because each one closes a specific failure mode:

| Block | Closes |
|---|---|
| **INSTRUCTIONS** | Scope creep into another team's files |
| **KNOWLEDGE** | Agent inventing patterns instead of matching existing ones |
| **EXAMPLES** | Structural inconsistency across 18 people's output |
| **TOOLS** | Agent touching production/shared resources it shouldn't |
| **GUARDRAILS** | Silent violation of an architectural guarantee |
| **VERIFICATION** | "Looks right, passes nothing" — the 80% problem |

**Sequencing rule:** Phase 0 must complete before any team prompt runs. Teams are blocked on the contract, not on each other.

**Golden rule for every developer:** if the agent's output fails verification, diagnose the root cause. Never weaken a test to make it pass.

---

## Changes I Made To The Submitted Outline

Kept your epics, stories, and ownership. Six corrections, all for product quality:

1. **US-C5 had a design task and a test task but no implementation task** — the audit log would have been specced and tested but never built. Added the build prompt (T3-P7).
2. **Team 3's Scrum Master was assigned CRON-job building and email-trigger programming** — coder work on a tester. Reassigned to Coder 2; SM keeps ceremony + verification work.
3. **Team 2's Analyst 2 was assigned "build review list screen"** — same issue. Moved to Coder 2.
4. **No task anywhere owned the notification outbox.** Emails were being triggered directly from business logic, which loses notifications on rollback. Added it explicitly to Team 3.
5. **"Deploy frontend to Vercel" sat under US-B5 (public availability board)** — deployment is infrastructure, not a story feature. Pulled into Phase 0 and the integration phase.
6. **The concurrency guarantee was implicit** ("apply database-level checks"). Made the exclusion constraint an explicit, separately-verified task — it is the single most important line of code in the system.

---

# PHASE 0 — ARCHITECT (Days 1–2, before any team starts)

> **Starting state: the repo contains exactly two files — `README.md` and `AGENTS.md`.**
> Nothing else. No package.json, no folders. These prompts take it from there.

### P0-1 · Scaffold the monorepo

```
INSTRUCTIONS
This repository currently contains only README.md and AGENTS.md. Read both
completely before doing anything. Scaffold the npm-workspaces monorepo they
describe. Create structure and configuration only — no feature code, no
business logic, no database models yet.

KNOWLEDGE
README.md defines the folder structure and team ownership map.
AGENTS.md defines the stack, conventions, and non-negotiable rules.
Both are authoritative. If they conflict, stop and tell me rather than choosing.

EXAMPLES
Follow the exact folder layout in README.md's structure section:
client/ (React + Vite), server/ (Express + Prisma), shared/ (frozen contract).
Root package.json declares all three as npm workspaces.

TOOLS
You may create files, create folders, and run npm commands locally.
Do not run anything against a remote database or deploy anything.

GUARDRAILS
- React + Vite for the client. Not Next.js. Not Create React App.
- Express for the server. Do not introduce a framework not named in AGENTS.md.
- Create .env.example files with variable NAMES and placeholder values only.
  Never create a real .env, never invent credentials.
- Do not add any dependency not required for scaffolding. No UI kits yet.
- Do not create business logic, models, or routes. Structure only.

VERIFICATION
After scaffolding, run `npm install` at root and confirm all three workspaces
resolve. Then show me: the folder tree, the root package.json scripts, and both
.env.example files. Do not proceed to anything else until I approve.
```

### P0-2 · Write the frozen contract

```
INSTRUCTIONS
Populate shared/ with the frozen data contract for the venue booking system.
This is the single artifact all three teams import from, so it must be complete
before any team starts. Define entities, enums, API request/response shapes, and
the booking state machine as data.

KNOWLEDGE
Read AGENTS.md's state machine section and architectural rules first.
The entities required: users, roles, venues, venue_blocks, approval_chains,
bookings (with a timeslot range), approvals, delegations, audit_log,
notification_outbox.

EXAMPLES
Export everything through a single barrel index so consumers write one import.
Keep it declarative — this file describes shapes and allowed values, it contains
no logic and no database calls.

TOOLS
You may create and edit files inside shared/ only.

GUARDRAILS
- The state machine must include EVERY transition in AGENTS.md, including
  Pending → Cancelled (auto-expiry) and Modified → Pending (re-approval).
- Define allowed transitions as data (a map), not as scattered if-statements.
- Do not add a field that no story needs. Speculative fields become dead weight
  that three teams then have to reason about.
- No imports from client/ or server/. shared/ depends on nothing.

VERIFICATION
List every entity with its fields, and print the full transition map as a table
showing from-state, to-state, and trigger. I will review this against the
architecture diagram before it is frozen.
```

### P0-3 · Schema and the concurrency guarantee

```
INSTRUCTIONS
Create the initial Prisma schema and first migration from the frozen contract in
shared/. Then add the PostgreSQL exclusion constraint that makes double-booking
structurally impossible.

KNOWLEDGE
Read shared/ (the contract) and AGENTS.md rule 1. Prisma cannot express an
exclusion constraint in its schema DSL — it must be added as raw SQL inside the
migration file.

EXAMPLES
One migration folder, timestamp-prefixed, containing migration.sql.
The exclusion constraint requires the btree_gist extension.

TOOLS
You may create the schema, generate migrations, and run them against the LOCAL
dev database only. Never run a migration against any remote database.

GUARDRAILS
- The clash constraint must be an EXCLUDE constraint on (venue_id, timeslot),
  scoped to active statuses only. Never a SELECT-then-INSERT check.
- audit_log must have UPDATE and DELETE revoked at the database level. Its
  immutability is a grant, not a convention.
- Every model must match shared/ exactly. If something is missing from shared/,
  stop and tell me — do not add it here unilaterally.

VERIFICATION
Write and run a script that fires 20 simultaneous booking requests for the same
venue and timeslot. Exactly one must succeed and 19 must be rejected by the
database. Show me the output. Then attempt an UPDATE on audit_log and show me
that it is refused.
```

### P0-4 · Guardrails and CI

```
INSTRUCTIONS
Set up the automated guardrails that enforce our architectural rules without
human vigilance: pre-commit hooks and a CI workflow.

KNOWLEDGE
Read AGENTS.md's hard-rules section. Each hard rule that can be checked
mechanically should be checked mechanically.

EXAMPLES
Pre-commit hooks run fast and locally. CI runs the full suite on every PR.

TOOLS
You may create config files and CI workflow files. Do not configure any
deployment or publish step.

GUARDRAILS
Implement at minimum:
- Block commits containing secrets, credentials, or a real .env file.
- Block any diff touching prisma/schema.prisma without a matching migration file.
- CI: install → lint → run full test suite. Fail the build on any failure.
- CI: fail if any file outside the outbox worker imports the email client.
- CI: fail if audit_log appears with .update( or .delete(.

VERIFICATION
Prove each guardrail fires. Deliberately stage a fake secret, a schema edit with
no migration, and a direct mailer import — show me each one being blocked, then
revert. A guardrail nobody has seen fire is a guardrail nobody can trust.
```

### P0-5 · Deployment skeleton

```
INSTRUCTIONS
Wire up the deployment path end to end with a placeholder app, so that shipping
is proven in week 1 rather than discovered as broken in week 2.

KNOWLEDGE
Read README.md's deployment section. The client builds with Vite; the server
serves the built client as static files with SPA fallback, alongside the API.

EXAMPLES
Build output from client/ is copied into the server's static directory.
Support a configurable base path for subpath mounting.

TOOLS
You may build locally and configure deployment settings. Do not deploy to
production without my explicit go-ahead in a later message.

GUARDRAILS
- No secrets in any committed config file.
- The API and static file serving must not shadow each other — API routes take
  precedence, SPA fallback is last.

VERIFICATION
Build the client, serve it through the server locally, and show me: the SPA
loading at the root URL, a deep link surviving a page refresh, and a health-check
endpoint returning OK.
```

**Gate:** Do not release teams until P0-1 through P0-5 all pass verification. A team building against an unfrozen contract will need rework — which you do not have time for in two weeks.

---

# TEAM 1 — TAROT CLUB
## Epic A: Data Core & Admin Console

**Members:** Coder 1, Coder 2 (Product Owner), Analyst 1, Analyst 2, Tester 1, Tester 2 (Scrum Master)

### T1-P1 · Analyst 1+2 — Venue registry research *(no agent — human fieldwork)*

Not everything is a prompt. Cataloguing real IIML spaces and interviewing PGP Office / Estate Office are human tasks. **Deliverable: `specs/venue-registry.md`** listing every space with capacity, type, location, attributes (projector, sound system, etc.), and its approval path. Everything downstream depends on this file existing, so it is due Day 2.

### T1-P2 · Coder 1 — Booking lifecycle API

```
INSTRUCTIONS
Implement the booking lifecycle endpoints for US-A2: create, view, modify, and
cancel a booking. Work only in server/src/routes/, server/src/controllers/, and
server/src/middleware/. Do not modify shared/ or prisma/schema.prisma.

KNOWLEDGE
Read AGENTS.md, shared/ (entities and state machine), specs/US-A2.md, and the
existing migration to understand the exclusion constraint already in place.

EXAMPLES
Follow the layering in AGENTS.md: routes → middleware → controllers → prisma.
Controllers call Prisma directly. Do not introduce a service layer.

TOOLS
You may read any file, write in the folders named above, and run the test suite
and local dev database.

GUARDRAILS
- Never implement a clash check in application code. The database exclusion
  constraint is the guarantee; your job is to catch its error and return a clean
  409 response.
- Every status change goes through the state machine in shared/. Never assign a
  status directly.
- Every state change writes an audit_log row IN THE SAME TRANSACTION.
- Modify must re-trigger approval on date, time, OR venue change — not date only.
- Cancel must release the slot immediately.

VERIFICATION
Write and run tests covering: create succeeds, create on an occupied slot returns
409, cancel frees the slot for immediate rebooking, modify moves the booking back
to Pending, and every one of those actions leaves exactly one audit_log row.
Show me the passing output.
```

### T1-P3 · Coder 2 (PO) — State machine enforcement

```
INSTRUCTIONS
Implement the booking state machine as an enforced database-level guard, so that
no code path anywhere in the system can set an invalid status. Work in
prisma/migrations/ and server/src/lib/ only.

KNOWLEDGE
Read the transition map in shared/ and AGENTS.md rule 6. The transition map is
the specification; your job is to enforce it, not to redesign it.

EXAMPLES
A database trigger that validates the old status → new status pair against the
allowed-transitions table, and rejects anything not listed.

TOOLS
You may write migrations and run them locally. Schema changes require a reviewed
migration — do not edit schema.prisma directly without one.

GUARDRAILS
- Enforcement lives in the database, not in a helper function that callers can
  forget to call.
- Include the auto-expiry transition (Pending → Cancelled) and the re-approval
  loop (Modified → Pending).
- Completed is terminal. Nothing transitions out of it.

VERIFICATION
Write tests that attempt five ILLEGAL transitions (e.g. Completed → Pending,
Rejected → Approved) directly against the database, bypassing the API entirely.
All five must be refused. Show me the output — this test proves the guard cannot
be bypassed, which is the whole point.
```

### T1-P4 · Coder 1 — Pending-hold expiry job

```
INSTRUCTIONS
Implement the scheduled job that auto-expires unapproved bookings, so pending
requests cannot hold prime venues indefinitely. Work in server/src/lib/ (the
scheduler) and server/src/controllers/.

KNOWLEDGE
Read AGENTS.md's state machine (the Pending → Cancelled transition) and
specs/US-A2.md for the expiry window.

EXAMPLES
Follow the existing scheduler pattern in server/src/lib/. The job finds eligible
bookings and moves them through the normal state-machine path.

TOOLS
You may write scheduler code and run it locally with a shortened interval for
testing. Do not schedule anything against a remote database.

GUARDRAILS
- The expiry must go through the state machine, not a direct status write.
- It must write an audit_log row and a notification_outbox row, both in the same
  transaction as the status change.
- Never expire a booking that has any approval decision already recorded.

VERIFICATION
Create a booking, artificially age it past the expiry window, run the job, and
show me: the booking is Cancelled, the slot is immediately bookable again, an
audit row exists, and an outbox row exists. Then create a booking with one
approval recorded, run the job, and show me it is untouched.
```

### T1-P5 · Coder 2 (PO) — Venue registry and admin CRUD

```
INSTRUCTIONS
Implement US-A3 and US-A4: the venue registry API and the admin interface for
managing venues and blocking dates. Server work in server/src/controllers/ and
routes/; client work in client/src/pages/ and client/src/components/.

KNOWLEDGE
Read specs/venue-registry.md (the real IIML space catalogue from Analyst 1+2),
shared/ for venue and venue_block shapes, and AGENTS.md conventions.

EXAMPLES
Match the existing controller structure on the server. On the client, follow the
component conventions in AGENTS.md — PascalCase files, one component per file.

TOOLS
You may read any file, write in the folders named above, run tests, and run the
local dev server.

GUARDRAILS
- Only an Admin role may write venues or blocks. Enforce this in middleware, not
  by hiding buttons in the UI.
- A blocked date range must make the venue unbookable for that window —
  verify this actually blocks, rather than only rendering differently.
- Seed the registry from specs/venue-registry.md. Do not invent venue names.

VERIFICATION
Test that: a non-admin calling the venue-write endpoint directly is refused with
403, a blocked date range rejects booking attempts inside it, and the seeded
registry matches specs/venue-registry.md exactly. Show me all three passing.
```

### T1-P6 · Analyst 1 — Utilization metrics spec *(spec-first, then build)*

```
INSTRUCTIONS
Implement the utilization dashboard for US-A5. First read the metric definitions
in specs/US-A5.md — do not invent metrics. Build the aggregation endpoints and
the dashboard view.

KNOWLEDGE
specs/US-A5.md defines each metric and its formula. shared/ defines the booking
and venue shapes. Read both before writing anything.

EXAMPLES
Follow existing controller patterns for the aggregation endpoints and existing
page patterns for the dashboard.

TOOLS
Read any file; write in server/src/controllers/, server/src/routes/, and
client/src/pages/. Run tests and the local dev server.

GUARDRAILS
- Every metric must match its formula in specs/US-A5.md exactly. If a formula
  is ambiguous, stop and ask rather than choosing an interpretation.
- Dashboard data is Admin-only. Enforce server-side.
- Aggregate in the database; do not pull all bookings into memory and reduce.

VERIFICATION
Seed a known dataset where you can compute every metric by hand. Show me the
dashboard output beside the hand-computed values. They must match exactly —
"the chart renders" is not verification.
```

### T1-P7 · Tester 1 — Concurrency and integrity suite

```
INSTRUCTIONS
Write the automated test suite that proves Epic A's guarantees hold under stress.
Work only in server/tests/. Do not modify application code — if a test reveals a
bug, report it, do not patch around it.

KNOWLEDGE
Read AGENTS.md's non-negotiable rules. Each rule is a test case. Read
server/src/controllers/ to understand what you are testing.

EXAMPLES
Follow the existing test file structure and naming.

TOOLS
You may write tests and run them against the local dev database. You may not
modify files outside server/tests/.

GUARDRAILS
- Test the guarantee, not the implementation. Assert that double-booking is
  impossible — not that a particular function was called.
- Concurrency tests must fire genuinely parallel requests, not a sequential loop.

VERIFICATION
The suite must cover, at minimum: (1) 50 concurrent bookings on one slot → exactly
one succeeds; (2) audit_log rejects UPDATE and DELETE; (3) all illegal state
transitions are refused; (4) an expired pending booking frees its slot; (5) a
non-admin is refused on every admin endpoint. Show me the full run output.
```

### T1-P8 · Tester 2 (SM) — Blocker log *(no agent)*

Daily stand-up notes and a running blocker log in `docs/blockers.md`, plus coordination with the other two Scrum Masters. Human work — but the blocker log is what the Architect reads each morning to unblock integration.

---

# TEAM 2 — PRODNOVA
## Epic B: Identity & Stakeholder Experience

**Members:** Coder 1, Coder 2, Coder 3 (Product Owner), Analyst 1, Analyst 2, Tester 1, Tester 2 (Scrum Master)

### T2-P1 · Analyst 1+2 — Wireframes *(no agent — Figma)*

Search page with filters, booking request form, approver review dashboard, public availability board, mobile admin summary. **Deliverable: `specs/wireframes.md`** with Figma links and, for each screen, the fields, states (loading / empty / error), and role visibility. Due Day 2 — every T2 client prompt below references it.

### T2-P2 · Coder 1 — Authentication and session

```
INSTRUCTIONS
Implement US-B1: institutional single sign-on restricted to the campus email
domain, plus session handling. Work in server/src/routes/auth.js,
server/src/middleware/auth.js, and server/src/lib/.

KNOWLEDGE
Read AGENTS.md rule 4 (authorization is server-side) and specs/US-B1.md.
Read shared/ for the user and role shapes.

EXAMPLES
Follow the existing middleware structure. Session tokens attach to every
authenticated request; middleware verifies before any controller runs.

TOOLS
Read any file; write in the files named above. Run tests locally. Never commit
real OAuth credentials — use .env.example placeholders.

GUARDRAILS
- The institutional domain restriction must be verified SERVER-SIDE from the
  verified token claim. The client-side domain hint is advisory and spoofable —
  never rely on it alone.
- Never trust a role sent by the client. Roles are read from the database.
- No credentials, client secrets, or tokens in any committed file.

VERIFICATION
Test that: a valid institutional account signs in successfully, a non-institutional
account is refused, a request with a tampered role claim is refused, and a request
with no session is refused on every protected route. Show me all four.
```

### T2-P3 · Coder 3 (PO) — Auto-registration and role elevation

```
INSTRUCTIONS
Implement US-B2: new users auto-register with the lowest-privilege role, plus the
admin-only interface for elevating roles. Server work in controllers and
middleware; client work in client/src/pages/.

KNOWLEDGE
Read shared/ for the role model, specs/wireframes.md for the admin screen, and
AGENTS.md rule 4.

EXAMPLES
Follow existing controller and page patterns.

TOOLS
Read any file; write in server/src/controllers/, server/src/routes/, and
client/src/pages/. Run tests and local dev.

GUARDRAILS
- New users always default to Booker. Never allow self-elevation by any path.
- Role changes must be Admin-only, enforced in middleware, and audit-logged.
- The first Admin comes from the seed migration — do not build a bootstrap
  backdoor endpoint.

VERIFICATION
Test that: a first-time sign-in creates a Booker, a Booker calling the elevation
endpoint directly is refused with 403, an Admin can elevate successfully, and
every elevation writes an audit_log row. Show me all four passing.
```

### T2-P4 · Coder 2 — Search, filters, availability grid

```
INSTRUCTIONS
Implement the venue search view, filter panel, and availability grid component
for US-B3. Work only in client/src/pages/, client/src/components/, and
client/src/hooks/.

KNOWLEDGE
Read specs/wireframes.md for the search page layout, shared/ for venue and
booking shapes, and the venue API built by Team 1 (Tarot Club).

EXAMPLES
Follow the component conventions in AGENTS.md. Use the project's data-fetching
hook pattern in client/src/hooks/ — do not introduce a second approach.

TOOLS
Read any file; write in the folders named above. Run the local dev server.

GUARDRAILS
- Do not modify shared/ or any server file. If you need a field or endpoint that
  does not exist, stop and raise it — do not work around it client-side.
- Handle loading, empty, and error states for every data view. A screen that only
  handles the happy path is not done.
- The grid must reflect real availability from the API, never mock data.

VERIFICATION
Show me the search view working against the live local API with: results
rendering, each filter narrowing correctly, the grid showing real busy/free
state, and the empty and error states rendering properly.
```

### T2-P5 · Coder 3 (PO) — Booking request form and My Bookings

```
INSTRUCTIONS
Implement the booking request form and the My Bookings view (with modify and
cancel actions) for US-B3. Client-side only: client/src/pages/,
client/src/components/, client/src/hooks/.

KNOWLEDGE
Read specs/wireframes.md, shared/ for the booking shape and state machine, and
Team 1's booking lifecycle endpoints.

EXAMPLES
Match the form and page patterns already established in client/src/pages/.

TOOLS
Read any file; write in the folders named above. Run local dev.

GUARDRAILS
- The clash error (409) from the server must render as a clear, human message —
  never a raw error or a silent failure.
- Modify must warn the user that changing date, time, or venue re-triggers
  approval. Do not hide this.
- Never construct booking status transitions client-side. Call the API.

VERIFICATION
Demonstrate: submitting a valid request, submitting a request for an occupied
slot and seeing a clear conflict message, cancelling a booking and seeing the
slot free up, and modifying a booking and seeing it return to Pending.
```

### T2-P6 · Coder 2 — Approver review workspace

```
INSTRUCTIONS
Implement the approver dashboard for US-B4: the pending-request list with
approve/reject actions and per-step comments. Client-side only.

KNOWLEDGE
Read specs/wireframes.md for the approver screen, and coordinate with Team 3
(Sprint & Tonic) on the approval endpoints — read their route definitions rather
than assuming shapes.

EXAMPLES
Follow existing page and component patterns.

TOOLS
Read any file; write in client/src/pages/, components/, hooks/. Run local dev.

GUARDRAILS
- The list must show only requests where THIS approver is the current step.
  Server-side filtering — never fetch everything and filter in the browser.
- Rejection must require a comment. Approval may make it optional.
- Do not implement routing logic client-side. The server decides who acts next.

VERIFICATION
With seeded multi-step bookings, show me: approver A sees only their step,
approver B sees nothing until A approves, rejection without a comment is blocked,
and after A approves, B's list updates.
```

### T2-P7 · Coder 1 — Public board and mobile responsiveness

```
INSTRUCTIONS
Implement US-B5 (login-free public availability board) and US-B6 (mobile-
responsive admin overview). Client-side, plus one public read-only endpoint on
the server if one does not exist.

KNOWLEDGE
Read specs/US-B5.md for the privacy standard, specs/wireframes.md for both
screens, and AGENTS.md.

EXAMPLES
Follow existing patterns for both the endpoint and the pages.

TOOLS
Read any file; write in client/ and, if needed, one public route in server/.

GUARDRAILS
- THE PUBLIC BOARD MUST EXPOSE ONLY BUSY/FREE STATUS. Never the booker's
  identity, event purpose, or any other booking detail. Enforce this in the
  endpoint's query, not by omitting fields in the UI — the API response itself
  must not contain them.
- The public endpoint must require no authentication and must not accept a
  session token as an escalation path.
- Responsive work must not break desktop layouts.

VERIFICATION
Call the public endpoint with no session and show me the RAW JSON response —
it must contain no identity or purpose fields whatsoever. Then show the board
and admin overview at mobile, tablet, and desktop widths.
```

### T2-P8 · Tester 1 — End-to-end journey suite

```
INSTRUCTIONS
Write the automated tests covering Epic B's user journeys. Work only in
tests/. Do not modify application code — report bugs, do not patch them.

KNOWLEDGE
Read all Epic B specs and the implemented routes.

EXAMPLES
Follow existing test structure.

TOOLS
Write and run tests. No edits outside tests/.

GUARDRAILS
- Test permission boundaries by calling APIs DIRECTLY, bypassing the UI. UI-level
  testing cannot prove authorization.
- Include the public-board privacy assertion as a hard test, not a manual check.

VERIFICATION
Cover: full booker journey (sign in → search → request → view), full approver
journey, non-institutional sign-in refused, every role's forbidden endpoints
returning 403, and the public endpoint leaking no identity. Show the full run.
```

---

# TEAM 3 — SPRINT & TONIC
## Epic C: Approval Engine & Notifications

**Members:** Coder 1, Coder 2, Tester 1, Tester 2 (Scrum Master), Analyst 1 (Product Owner)

> This is the smallest team carrying the most architecturally sensitive work. Their prompts have the tightest guardrails deliberately.

### T3-P1 · Analyst 1 (PO) — Approval chain design *(spec, then build)*

Deliverable: `specs/approval-chains.md` — for every venue type, the ordered approver roles, the escalation window, delegation rules, and the special coordination (non-approval) workflow for grounds with multi-team scheduling conflicts. Human design work with stakeholder input. Due Day 2.

### T3-P2 · Coder 1 — Configurable approval chains

```
INSTRUCTIONS
Implement US-C1: approval chains as configurable data, plus the admin page to
configure them. Server work in controllers/routes; client work in
client/src/pages/.

KNOWLEDGE
Read specs/approval-chains.md (Analyst 1's design), shared/ for the
approval_chain shape, and AGENTS.md rule 5.

EXAMPLES
Follow existing controller and page patterns.

TOOLS
Read any file; write in the folders named above. Run tests and local dev.

GUARDRAILS
- Chains are DATA. Changing a chain must never require a code change or deploy.
- Chain config is Admin-only, enforced server-side.
- Editing a chain must NOT affect any booking already in flight — those run on
  their snapshot. Your endpoint must not touch existing approval steps.

VERIFICATION
Create a booking under chain version 1, then edit the chain, then show me the
in-flight booking still following the ORIGINAL sequence while a new booking
follows the edited one. This is the single most important test in Epic C.
```

### T3-P3 · Coder 1 — Sequential routing engine

```
INSTRUCTIONS
Implement US-C2: the sequential approval routing engine. When a booking is
created, snapshot its chain into approval steps; when an approver decides, move
to the next step or finalize. Work in server/src/controllers/ and
server/src/lib/ only.

KNOWLEDGE
Read specs/approval-chains.md, specs/US-C2.md, shared/ for the state machine,
and AGENTS.md rules 2, 3 and 5.

EXAMPLES
Follow the existing controller layering.

TOOLS
Read any file; write in the folders named above. Run tests and the local database.

GUARDRAILS
- Only the approver at the LOWEST undecided step may act. Enforce server-side.
- Rejection at any step → booking Rejected, all remaining steps voided, slot
  released immediately.
- Approval on the final step → booking Approved.
- Read the chain from the booking's SNAPSHOT, never from live config.
- WRITE NOTIFICATIONS TO notification_outbox ONLY. Never call the mailer from
  this file. A direct mailer import here will fail CI.
- Every decision writes an audit_log row in the same transaction.

VERIFICATION
Test all of: approving in order advances correctly; a later approver acting out
of order is refused; rejection at step 2 voids step 3 and frees the slot; the
final approval sets Approved; two concurrent decisions on the same step result
in exactly one being recorded. Show me every case.
```

### T3-P4 · Coder 2 — Escalation and delegation

```
INSTRUCTIONS
Implement US-C3: the escalation sweep for stalled approvals and the delegation
feature for unavailable approvers. Work in server/src/lib/scheduler.js and
server/src/controllers/.

KNOWLEDGE
Read specs/approval-chains.md for the escalation window and delegation rules,
and the routing engine (T3-P3) to understand how steps are resolved.

EXAMPLES
Follow the existing scheduler pattern already used by the expiry job.

TOOLS
Read any file; write in the folders named above. Run locally with a shortened
interval for testing.

GUARDRAILS
- Delegation resolves the EFFECTIVE approver at decision time, not at booking
  creation. A delegation set today must apply to bookings created yesterday.
- Escalation must never auto-approve. It flags and notifies only — a stalled
  request stays pending until a human decides.
- All notifications go to the outbox. Never call the mailer here.
- Escalation and delegation must compose: if an approver has delegated AND the
  step has escalated, define and test the resulting behaviour explicitly.

VERIFICATION
Test: a step stalled past the window gets flagged and produces outbox rows for
the next tier; escalation does NOT change the booking status; a delegated step
is actionable by the substitute and refused for the original; and the combined
delegation-plus-escalation case behaves as specified. Show all four.
```

### T3-P5 · Coder 2 — Notification outbox and delivery worker

```
INSTRUCTIONS
Implement US-C4: the transactional outbox delivery worker — the ONLY component
in this system permitted to send email. Work in server/src/lib/ only.

KNOWLEDGE
Read AGENTS.md rule 2 and specs/US-C4.md. Read the routing engine to see how
outbox rows are written by producers.

EXAMPLES
Producers write; this worker reads, sends, and marks. It runs after commit,
never inside the producing transaction.

TOOLS
Read any file; write in server/src/lib/. Send only to a test/sandbox mailbox
during development — never to real user addresses.

GUARDRAILS
- This is the SOLE SENDER. No other file may import the email client.
- Sends happen only AFTER the producing transaction commits. A rolled-back
  booking must never generate an email.
- Delivery must be idempotent — a retry must not send a duplicate.
- Failed sends retry with backoff and remain in the outbox. Never drop a row on
  failure.
- Never log full email bodies containing personal data.

VERIFICATION
Prove three things and show me each: (1) a booking transaction that is rolled
back leaves ZERO outbox rows and sends nothing; (2) a simulated provider failure
leaves the row pending and retries, with no duplicate on eventual success; (3)
running the worker twice over the same row sends exactly one email.
```

### T3-P6 · Analyst 1 (PO) — Email templates

```
INSTRUCTIONS
Write the copy and build the templates for every state-transition email. Work
only in server/src/lib/templates/.

KNOWLEDGE
Read the state machine in shared/ — there is one template per transition that
notifies someone. Read specs/US-C4.md for tone and required content.

EXAMPLES
Follow the existing template structure.

TOOLS
Write template files only. Do not modify the sending worker.

GUARDRAILS
- Every email must state: what happened, which venue and slot, and what (if
  anything) the recipient must do next.
- Never include another user's personal details in an email to a different user.
- No template may contain a hard-coded URL, name, or environment value.

VERIFICATION
Render every template with sample data and show me the full set. Confirm that
each transition in the state machine that requires notification has exactly one
template, and that none is missing.
```

### T3-P7 · Coder 1 — Audit log implementation *(added — missing from the outline)*

```
INSTRUCTIONS
Implement US-C5: audit logging on every booking and approval event, plus the
admin-only audit trail viewer. Server work in controllers and lib; client work
in client/src/pages/.

KNOWLEDGE
Read AGENTS.md rule 3, shared/ for the audit_log shape, and specs/US-C5.md.
Note the migration already revokes UPDATE and DELETE at the database level.

EXAMPLES
Follow existing controller and page patterns.

TOOLS
Read any file; write in the folders named above. Run tests locally.

GUARDRAILS
- Audit writes happen in the SAME transaction as the event they record. An event
  that commits without its audit row is a bug, not an edge case.
- The viewer is read-only and Admin-only. It must expose no mutation path at all.
- Never write UPDATE or DELETE against audit_log — CI will fail the build.

VERIFICATION
Test that: every booking and approval action produces exactly one audit row;
a rolled-back action produces zero; a non-admin is refused on the viewer
endpoint; and the viewer offers no way to alter a record. Show all four.
```

### T3-P8 · Tester 1 — Approval engine regression suite

```
INSTRUCTIONS
Write the regression suite for the approval engine and notification pipeline.
Work only in tests/. Do not modify application code.

KNOWLEDGE
Read specs/approval-chains.md, US-C2 through US-C5, and the implemented engine.

EXAMPLES
Follow existing test structure.

TOOLS
Write and run tests. No edits outside tests/.

GUARDRAILS
- Test the guarantees: correct order, correct voiding on rejection, snapshot
  isolation, no lost or duplicated notifications, no audit gaps.
- Include the chain-edited-mid-flight case as a first-class test, not an
  afterthought — it is the most likely thing to silently regress.

VERIFICATION
Show me the full suite passing, and confirm it covers every edge case listed in
specs/approval-chains.md. Any case in the spec without a matching test is a gap
— name it rather than skipping it.
```

### T3-P9 · Tester 2 (SM) — Ceremonies and blockers *(no agent)*

Stand-ups, blocker tracking in `docs/blockers.md`, and cross-team coordination — especially with Prodnova, since the approver UI depends on this team's endpoints.

---

# INTEGRATION PHASE (Final 2 days — Architect + all three SMs)

### INT-P1 · Cross-team end-to-end test

```
INSTRUCTIONS
Write and run the single end-to-end test that exercises all three epics together.
Work only in tests/e2e/.

KNOWLEDGE
Read all specs. This test crosses every team boundary, so it is the one that
catches integration assumptions no single team could see.

EXAMPLES
One continuous scenario, not three isolated ones.

TOOLS
Write and run tests against a clean seeded local database.

GUARDRAILS
- Use real API calls throughout. No mocking of another team's layer — mocks hide
  exactly the mismatches this test exists to find.
- Reset to a clean seeded state at the start.

VERIFICATION
The scenario must run start to finish: sign in with an institutional account →
search venues → submit a request → routed to approver 1 → approved → routed to
approver 2 → approved → booking Approved → outbox produced the correct emails at
each step → audit trail is complete and gapless → the public board shows the slot
busy WITHOUT revealing who booked it. Show me the full trace.
```

### INT-P2 · Pre-demo hardening

```
INSTRUCTIONS
Prepare the system for demonstration. Fix only what verification identifies —
this is not a refactoring window.

KNOWLEDGE
Read docs/blockers.md and the full test output from all three teams.

TOOLS
Read any file. Make targeted fixes only, with my approval for anything touching
shared/ or the schema.

GUARDRAILS
- No new features. No dependency additions. No refactors.
- Never weaken or skip a failing test to make the suite green.
- Seed realistic demo data — real IIML venue names from specs/venue-registry.md.

VERIFICATION
Run the complete suite across all three teams plus the E2E scenario. Show me the
full output with zero failures and zero skipped tests. Then walk the demo path
end to end once, live.
```

---

# Two-Week Schedule

| Days | Architect | Tarot Club | Prodnova | Sprint & Tonic |
|---|---|---|---|---|
| **1–2** | P0-1 → P0-5 | T1-P1 (venue research) | T2-P1 (wireframes) | T3-P1 (chain design) |
| **3–5** | Review, unblock | T1-P2, T1-P3 | T2-P2, T2-P3 | T3-P2, T3-P3 |
| **6–7** | Contract arbitration | T1-P4, T1-P5 | T2-P4, T2-P5 | T3-P4 |
| **8–10** | Integration watch | T1-P6, T1-P7 | T2-P6, T2-P7 | T3-P5, T3-P6, T3-P7 |
| **11–12** | INT-P1 | T1-P7 finish | T2-P8 | T3-P8 |
| **13–14** | INT-P2, demo prep | Demo support | Demo support | Demo support |

**Critical path:** P0-2 (the frozen contract) blocks all three teams, and T3-P3 (routing engine) blocks T2-P6 (approver UI). Protect those two.

---

# Rules For Every Team Member

1. **Never run a prompt before its spec file exists.** No spec means the agent invents requirements, and invented requirements are the 80% problem in its purest form.
2. **Never accept output that has not passed its VERIFICATION block.** "It runs" is not verification.
3. **Never weaken a test to make it pass.** Diagnose the root cause instead.
4. **Never edit `shared/` or `schema.prisma` without Architect review.** This is the one rule that, broken, costs all three teams a day.
5. **Add a rule to `AGENTS.md` every time an agent does something it should not do again.** The harness improves from observed failures, not from speculation.
6. **Review every line that ships.** Be most skeptical of code that looks clever and passes on the first attempt.
