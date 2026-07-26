# Team Onboarding — Read This First
## Venue Booking System, 2-Week Sprint

> Ten minutes. This gets you oriented and pointed at the right next file. If you
> remember one thing: **you don't write code, you direct and verify it — and the
> verifying is the actual job.**

---

## 1. What we're building

A campus venue-booking system for IIM Lucknow. Someone requests a venue, the
request routes through a chain of approvers in order, everyone gets emailed as the
status changes, and every action is logged. Four kinds of user: **Booker**,
**Approver**, **Admin**, and the **Public** (who can only see what's free).

## 2. How we work — the one-paragraph version

We use AI agents to write the code, but inside a system of constraints that keeps
the output trustworthy. Before any code is generated, three things exist: a
**rule file** the agent always reads (`AGENTS.md`), a **spec** for the specific
story, and **tests** that define what "correct" means. You run a structured
prompt, the agent produces code, and then you *verify* it against those tests and
read every line before it ships. This is the difference between "vibe coding"
(prompt and hope) and what we do (prompt inside guardrails and verify).

## 3. Your first hour

1. **Read `AGENTS.md` end to end.** It's short. The seven numbered rules are
   non-negotiable — they're the things that, if broken, cause outages or data
   leaks. You need to recognize them on sight.
2. **Read `README.md`'s ownership table** and find your team and your area.
3. **Get the project running locally** — the "Getting started" section of the
   README has the exact commands.
4. **Find your team's prompts** in the Team Prompt Playbook. They're labelled by
   team (Tarot Club / Prodnova / Sprint & Tonic) and numbered.

## 4. The rhythm of a task

```
Spec exists  →  Run the prompt  →  Agent generates  →  VERIFY  →  PR  →  Review  →  Merge
```

- **Never start before the spec exists.** No spec = the agent invents
  requirements, and invented requirements are where things silently go wrong.
- **The prompt is already written for you** in the playbook. Use it as-is; it has
  six blocks (instructions, knowledge, examples, tools, guardrails, verification)
  and each block is there for a reason. Don't strip it down.
- **VERIFY means you ran the verification block and watched it pass** — not that
  the code looks plausible. Paste the output into your PR.
- **Read every line before you open the PR.** If you can't explain a line, you
  can't ship it.

## 5. The five things that will bite you

These are the mistakes agents make that look fine and aren't. Learn to spot them:

1. **A direct email call in business logic.** All notifications go to the outbox
   table; only one worker sends. If you see the mailer imported anywhere else,
   that's a bug — and CI will block it.
2. **An application-level "is this slot taken?" check.** Double-booking is
   prevented by the database, not by app code. Don't let the agent add a check
   that races.
3. **A role trusted from the client.** Authorization is server-side, always. A UI
   that hides a button is not access control.
4. **A test that got weakened to pass.** The single most dangerous thing. If a
   test in your diff got looser, the suite is now lying. Revert it, fix the code.
5. **A missing edge case.** Open the spec's edge-case section and find each one in
   the code. The happy path always works in the demo; the edge case is what fails
   in front of the professor.

## 6. When the agent gets it wrong

Normal. Expected. Here's the response:

- **Don't weaken the test. Diagnose the root cause.** The test encodes what we
  want; the code is wrong until proven otherwise.
- **Re-prompt specifically:** tell the agent which test failed, what it expected,
  what it got, and ask it to diagnose before changing anything.
- **If it fails the same task three times, stop delegating it.** That task is in
  the hard 20% — do it by hand, line by line, or escalate to the Architect.
- **If the agent broke a rule, tell the Architect** so a line gets added to
  `AGENTS.md` and it never happens to anyone again.

## 7. Who to ask

- **Stuck on what a task means?** Your Product Owner (your team's Analyst 1).
- **Blocked by another team / a shape you depend on?** Your Scrum Master — it goes
  in `docs/blockers.md` and gets raised at the morning sync.
- **Need a field that isn't in `shared/`?** Do NOT add it. Raise it with the
  Architect so all three teams stay in sync.
- **Anything touching `shared/` or the schema?** Architect review, always.

## 8. Where everything lives

| You need... | Read... |
|---|---|
| The rules the agent follows | `AGENTS.md` |
| The big picture + how to run it | `README.md` |
| Your prompts | Team Prompt Playbook |
| How to verify and review | Verification & Review Playbook |
| Why we work this way | Agentic Engineering Playbook |
| What's blocking people today | `docs/blockers.md` |

---

> **The mindset:** the model generates; you provide judgment. Be most skeptical of
> code that looks clever and passed on the first try — that's exactly what a
> confident wrong answer looks like. Your value on this project is verification,
> not typing speed.
