## What / why

<!-- One or two sentences. Link the story/spec this implements. -->

Story: specs/<STORY-ID>.md

## Verification output

<!-- Paste the actual output of the prompt's VERIFICATION block here.
     "It runs" / "looks right" is not verification — the harness only trusts
     what you can paste. If a test doesn't exist yet for what you changed,
     that's a gap to name, not skip. -->

```
<paste here>
```

## Checklist

- [ ] A spec existed in `specs/` **before** this was generated — no spec means the agent invented requirements.
- [ ] I ran the prompt's VERIFICATION block myself and pasted the real output above.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes, and **no test was weakened or skipped** to make it pass — if a test failed, I diagnosed the root cause instead.
- [ ] I read every line of the diff and can explain each one.
- [ ] No `.env`, secret, or credential is included in this diff.

## Does this touch `shared/` or `server/prisma/schema.prisma`?

- [ ] No — same-team review is enough.
- [ ] Yes — a **cross-team reviewer** (not just someone from my own team) is requested, **and** the Architect has reviewed the spec for this change. Schema changes ship only as a reviewed Prisma migration — see README.md "Changing the schema".
