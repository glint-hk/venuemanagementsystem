# Repo Starter — What's Here

Drop these files into your empty GitHub repo to start day one with the full
agentic-engineering harness in place. This is the **configuration layer** — no
feature code. Teams build on top of it following the prompt playbooks.

## Files in this starter

| File | Purpose | Who edits it |
|---|---|---|
| `AGENTS.md` | Static context every coding agent loads. The seven non-negotiable rules, the state machine, conventions. | Architect (grows from observed failures) |
| `CLAUDE.md` | Pointer so Claude Code reads AGENTS.md. | Nobody — set and forget |
| `README.md` | Single source of truth. Architecture, ownership, getting started, FAQ. | Architect |
| `package.json` | npm workspaces root + dev scripts. | Architect (P0-1) |
| `.gitignore` | Protects secrets and build output. | Rarely |
| `.env.example` (client + server) | Variable names with placeholder values. | Each team as needed — never commit real `.env` |
| `specs/_TEMPLATE.md` | Copy per story before prompting. | Every analyst/PO |
| `specs/US-C2-sequential-approval.md` | Worked example spec (the hardest story). | Reference |
| `.github/PULL_REQUEST_TEMPLATE.md` | Forces verification output + checklists on every PR. | Nobody — enforced automatically |
| `.github/workflows/ci.yml` | Lint, tests, and the mechanical guardrails. | Architect (P0-4) |
| `docs/blockers.md` | Daily integration ritual log. | Scrum Masters + Architect |
| `CHANGE_MANAGEMENT.md` | Append-only release log. | Whoever ships |

## What is NOT here (built by the teams)

- `client/src/`, `server/src/`, `shared/` contents — created by Phase 0 prompts
  (P0-1 scaffolds, P0-2 fills the contract, P0-3 the schema).
- Actual specs for every story — analysts write these before their prompts run.
- Any feature code.

## The four playbooks (kept alongside this repo, not committed to it)

1. **Architecture Explained** — the 15-point system explanation.
2. **Agentic Engineering Playbook** — the harness: the five layers and why.
3. **Team Prompt Playbook** — all 30 prompts, team by team, Phase 0 → integration.
4. **Verification & Review Playbook** — the three checkpoints, the eval rubrics,
   the Definition of Done.

## Day-one sequence

1. Push this starter to the empty repo.
2. Architect runs Phase 0 prompts (P0-1 → P0-5) — scaffolds everything under
   `client/`, `server/`, `shared/`.
3. Analysts/POs write their Day-1/2 specs into `specs/`.
4. Teams start their prompts once the contract (P0-2) is frozen and verified.

> The whole point: by committing this starter, three teams begin against the same
> frozen rules and the same guardrails, instead of eighteen people inventing
> conventions in parallel and colliding in week two.
