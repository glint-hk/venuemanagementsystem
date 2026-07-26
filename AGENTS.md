# Agentic Engineering Playbook — IIML Venue Booking System

**How to structure AI-assisted development for enterprise-grade output**
Based on *The New SDLC With Vibe Coding* (Osmani, Saboo, Kartakis — Google, May 2026)

---

## 0. The Core Reframe

The paper's central equation:

```
Agent = Model + Harness
```

A raw model is not an agent. It becomes one when a harness gives it state, tool execution, feedback loops, and enforceable constraints. The paper's benchmark evidence: one team moved a coding agent from outside the Top 30 to the Top 5 on Terminal Bench 2.0 **by changing only the harness, with no model change at all.**

The practical consequence for us: **there is no single "best prompt."** What separates vibe coding from agentic engineering is not the wording of a request — a developer can vibe code or apply agentic engineering using the exact same agent. It is *how deliberately the harness is configured*. Our prompt gets short precisely because the context around it got thorough.

Five layers, in the order they must exist:

| Layer | Artifact | Written when | Owner |
|---|---|---|---|
| 1. Static context | `AGENTS.md` (or `CLAUDE.md`) | Once, before any code | Architect |
| 2. Intent | Per-story spec | Before each story | Analyst + Architect |
| 3. Contract | Tests + evals | **Before** generating code | Tester + Analyst |
| 4. Constraints | Guardrails / hooks | Once, refined continuously | Architect |
| 5. Task | The actual prompt | Per task | Any developer |

Layers 1–4 are the CapEx investment. Layer 5 is cheap because 1–4 exist.

---

## 1. Layer 1 — `AGENTS.md`: The Static Context

Always loaded, present in every interaction, so it must be dense and high-signal — never a dumping ground. Commit it at the repo root; review changes to it in pull requests like any other code.

### Template (fill for our project)

```markdown
# AGENTS.md — Venue Booking System

## What this project is
A campus venue-booking system for IIM Lucknow. Users request venues; requests
route through a sequential multi-tier approval chain; all parties are notified
of status changes; every action is audit-logged.
Roles: Booker, Approver (multi-tier), Admin/Registrar, Public (anonymous).

## Stack (do not substitute)
- Client: React + Vite SPA (NOT Next.js). react-router. TanStack Query for server state.
- Server: Node + Express (monolith, long-running). Prisma ORM.
- Database: PostgreSQL (production). SQLite acceptable for local dev only.
- Monorepo: npm workspaces — client/, server/, shared/.
- shared/ holds the FROZEN contract (entities, enums, API shapes) imported by both sides.

## Non-negotiable architectural rules
1. Double-booking is prevented by a PostgreSQL EXCLUDE constraint on
   (venue_id, timeslot tstzrange), NOT by application-level checks.
   Never replace this with a SELECT-then-INSERT pattern.
2. Notifications use the transactional outbox pattern. Business logic writes a
   row to notification_outbox INSIDE the same transaction as the state change.
   Business logic NEVER calls the email provider directly. Exactly one worker sends.
3. audit_log is append-only. Never write UPDATE or DELETE against it.
4. Authorization is enforced server-side in middleware on every authenticated
   route. Never trust a role claim from the client. UI hiding is not access control.
5. The approval chain is SNAPSHOTTED into approval steps at booking creation.
   Edits to chain config affect only NEW bookings, never in-flight ones.
6. Booking state transitions are validated against the state machine.
   No code path may set a status directly without going through it.
7. Schema changes ship ONLY as reviewed Prisma migrations. Never edit
   schema.prisma without an accompanying migration and Architect review.

## Booking state machine (authoritative)
Draft → Pending → Approved | Rejected
Pending → Cancelled (auto-expiry, scheduled job)
Pending → Modified | Approved → Modified
Modified → Pending (re-enters approval with a FRESH snapshotted chain)
Approved → Completed | Cancelled
Completed is terminal.

## Conventions
- React components: PascalCase.jsx, one component per file, filename = export name.
- Other modules: camelCase.js. Folders: lowercase, singular-by-concept.
- Relative imports only (no path aliases configured).
- Server layering: routes/ → middleware/ → controllers/ → lib/. Controllers call
  Prisma directly; there is no service layer. Do not introduce one.
- Env: .env is gitignored; only .env.example is committed. Never hard-code secrets.

## Hard rules (agent must never)
- Never commit secrets, API keys, or real .env values.
- Never bypass the state machine, the outbox, or the auth middleware "for now".
- Never invent a field that isn't in shared/ — raise it for contract review instead.
- Never modify another team's owned area without flagging it (see ownership map in README).
- Never add a dependency without stating why in the PR description.

## Workflow
Each team works off its own long-lived branch (`team1-data-core-admin`,
`team2-identity-stakeholder`, `team3-approval-notifications`), branched from
main. Feature branch per user story → PR into your team's branch → lint +
tests must pass → review by another team member → merge into the team branch.
The team branch itself → PR into main periodically → cross-team reviewer +
Architect review required if shared/ or schema was touched → merge into main.
```

**Rule of thumb from the paper:** start with roughly ten lines, then *add a rule every time the agent does something it should not do again.* The file grows from observed failures, not from speculation.

---

## 2. Layer 2 — The Per-Story Spec

The paper is explicit that requirements stop being a document handed between teams and become a conversation that produces specification and implementation simultaneously. But specification quality becomes **the new bottleneck** — implementation is no longer what's slow.

Each story gets a short spec before any generation:

```markdown
# SPEC: US-C2 — Sequential approval routing

## Intent
A booking request must be routed to approvers in the configured order for its
venue type, one step at a time, until all approve or any rejects.

## Inputs / Outputs
Input: booking_id, approver user, decision (approve|reject), optional comment.
Output: updated booking status, next approver notified (via outbox), audit row.

## Rules
- Only the approver matching the LOWEST undecided step may act.
- Approve on the last step → booking becomes Approved.
- Reject at any step → booking Rejected, all remaining steps voided, slot released.
- Chain is read from the booking's SNAPSHOTTED steps, never live config.

## Edge cases that must be handled
- Chain edited mid-request → snapshot governs; live config is ignored.
- Approver unavailable > 48h → escalation flag set by scheduled job.
- Delegation active → effective approver resolved at decision time.
- Duplicate/concurrent decisions on the same step → second one rejected cleanly.

## Out of scope
Email content and templates (US-C4). UI (Team 2).

## Done when
All acceptance tests in tests/approval-routing.test.js pass, plus the eval rubric
in evals/approval-routing.md scores pass on all five scenarios.
```

---

## 3. Layer 3 — Tests and Evals: The Real Contract

The paper's sharpest line for our purposes: **"Write the tests and evals before generating the code. Together they are the contract with the AI."** A well-written test and eval suite communicates intent more precisely than any natural-language prompt — and it is what turns AI-assisted development from vibe coding into agentic engineering.

Two mechanisms, both required:

| | **Tests** | **Evals** |
|---|---|---|
| Verify | Deterministic behaviour | Non-deterministic behaviour |
| Question | Does this input produce that output? | Did the agent take the right trajectory, use the right tools, meet the quality bar? |
| Checked by | Code | Labelled datasets, scoring rubrics, LM judges |

Without both, the paper says, the practice is *always* vibe coding regardless of how sophisticated the prompts are.

**Output evaluation** checks the final artifact: does it compile, do tests pass? **Trajectory evaluation** checks the sequence of steps — because *a fluent output that skipped its verification steps is a more dangerous failure than one with a visible error.*

For our project, the highest-value tests to write first (they encode the guarantees no reviewer should have to re-derive):

1. Concurrent booking attempts on the same venue+slot → exactly one succeeds.
2. A rolled-back booking transaction leaves **zero** rows in `notification_outbox`.
3. `UPDATE`/`DELETE` against `audit_log` is rejected at the database level.
4. A Booker calling an admin endpoint directly (bypassing UI) is refused.
5. Editing an approval chain mid-flight does not alter an in-progress booking.
6. A modified booking re-enters `Pending` with a fresh chain snapshot.

---

## 4. Layer 4 — Guardrails and Hooks

Deterministic code that runs at specific lifecycle points — before a tool call, after a file edit, before a commit. The paper's framing: *hooks are the place for things the agent should never forget but often does.*

Ours:

- **Pre-commit:** block secrets/hard-coded credentials; block `.env` from being staged.
- **Pre-commit:** reject any diff touching `schema.prisma` without a matching migration file.
- **CI gate:** lint + full test suite must pass before merge.
- **CI gate:** fail the build if `audit_log` is referenced with `update`/`delete`.
- **CI gate:** fail if a business-logic file imports the email client directly (outbox violation).

Guardrails encode the rules that cost the most when broken — which is exactly why they are code, not documentation.

---

## 5. Layer 5 — The Task Prompt Template

Only now does the prompt get written, and it is short. Structure it around the paper's **six types of context**:

```
INSTRUCTIONS (role + boundary)
Implement <task> for <story ID>. Work only within <folder(s)>.
Do not modify shared/ or schema.prisma — if you believe a contract change is
needed, stop and explain why instead of making it.

KNOWLEDGE (what to read first)
Read AGENTS.md, specs/US-C2.md, and the existing controllers in
server/src/controllers/ to match established patterns before writing anything.

EXAMPLES (pattern to follow)
Follow the structure of bookingController.js — same error handling, same
Prisma usage, same response shape.

TOOLS (what it may do)
You may read any file, run the test suite, and run migrations against the local
dev database. Do not run anything against a non-local database.

GUARDRAILS (hard constraints)
- Approval order comes from the booking's snapshotted steps, never live config.
- Write notifications to notification_outbox only; never call the mailer.
- Every state change must write an audit_log row in the same transaction.

VERIFICATION (definition of done)
tests/approval-routing.test.js must pass. Run it and show me the output.
If a test fails, diagnose the root cause before changing the test — never
weaken a test to make it pass.
```

Notice how much of this is *pointers into artifacts* rather than restated content. That is the design intent: static context (AGENTS.md) is expensive because every token is present in every interaction, so specifics load dynamically per task. The paper frames this as a genuine engineering trade-off — too much static context wastes tokens and dilutes signal; too little means the agent forgets critical rules.

---

## 6. Two Modes, and Which to Use When

The paper distinguishes **conductor** (real-time, in-IDE, keystroke-level control, developer always in the loop) from **orchestrator** (async, goal-level delegation, reviewing outcomes not keystrokes). Most developers move fluidly between both.

Mapping to our project:

| Work | Mode | Why |
|---|---|---|
| Schema design, state machine, exclusion constraint | **Conductor** | Architecturally load-bearing; every line must be understood |
| RLS/auth middleware, outbox worker | **Conductor** | Security-critical; failure is silent |
| CRUD controllers, admin UI, venue registry | **Orchestrator** | Well-specified against established patterns |
| Test suite generation, responsive styling pass | **Orchestrator** | Bounded, verifiable, easy to review |
| Approval routing edge cases | Conductor → Orchestrator | Design the rules by hand, delegate the implementation |

---

## 7. The 80% Problem — What Stays Human

The paper's most important warning for a student team: agents rapidly generate ~80% of a feature, but the remaining 20% — edge cases, error handling, integration points, subtle correctness — demands deep contextual knowledge that current models often lack. And the failure mode has shifted from syntax errors to *conceptual* ones: wrong assumptions about business logic, unasked clarifying questions, missed edge cases, architectural decisions that create long-term maintenance burden. These are harder to catch **precisely because the code "looks right" and may even pass basic tests.**

For our system, the 20% is concentrated in exactly the places we already identified as tricky:

- Whether a Pending request holds the slot, and for how long
- What a modification does to an already-approved booking
- What happens to in-flight requests when the chain is edited
- Who can act when an approver has delegated *and* escalation has fired
- Whether the public board leaks booker identity through any endpoint

**As Architect, these are mine to decide and verify — not to delegate.** The posture the paper recommends: use AI for what it is good at (rapid implementation of well-specified tasks) and reserve human attention for what it struggles with (ambiguous requirements, architectural trade-offs, correctness verification).

---

## 8. Why This Is Worth the Upfront Cost

The paper's economics section maps directly onto an 18-person, 6-week project:

- **Vibe coding = low CapEx, high OpEx.** Near-zero setup, but a compounding burden: token burn from re-prompting unverified mistakes, a maintenance tax when nobody can read the generated code six weeks later, and security remediation that costs far more in production than at design time.
- **Agentic engineering = high CapEx, low OpEx.** Upfront investment in schemas, deterministic tests, and structured context — after which the marginal cost of shipping and maintaining each feature drops sharply.

With three teams sharing one codebase, the CapEx is paid **once by the Architect** and amortised across 18 people and ~84 tasks. That is the strongest possible case for front-loading the harness.

---

## 9. Team Adoption Checklist

1. Commit `AGENTS.md` at the repo root before any feature work begins.
2. Every story gets a spec file in `specs/` before generation starts.
3. Tests and evals are written before the implementation they verify.
4. Pre-commit hooks and CI gates configured in week 1, not week 5.
5. Treat `AGENTS.md`, specs, and eval rubrics as **code**: reviewed in PRs, versioned, owned.
6. Make the boundary explicit — vibe coding is fine for throwaway spikes on a scratch branch; `main` requires the full discipline. Teams that keep this distinction blurry ship prototypes by accident.
7. Add a rule to `AGENTS.md` every time an agent does something it should not do again.

---

> **The paper's closing line, which is also the answer to "how do I prompt well":**
> *Generation is solved. Verification, judgment, and direction are the new craft.*
