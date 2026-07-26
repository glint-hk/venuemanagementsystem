# SPEC: <STORY-ID> — <Short title>

> Copy this file to `specs/<STORY-ID>.md` and fill it in BEFORE running any
> prompt for this story. A prompt without its spec makes the agent invent
> requirements — which is the 80% problem in its purest form.

## Intent
<One or two sentences: what value this delivers and for whom.>

## Inputs / Outputs
Input: <what the feature receives>
Output: <what it produces / what state changes>

## Rules
- <The business rules that govern behaviour.>
- <Be specific — "re-triggers approval on date, time, OR venue change", not "on change".>

## Edge cases that must be handled
- <Each edge case, explicitly. This section is where the 20% lives.>
- <A case not listed here will not be tested and will not be built.>

## Out of scope
<What this story does NOT cover, and which story does.>

## Done when
<The concrete, checkable condition. Usually: "all tests in tests/<x>.test.js pass,
plus the eval rubric in the Verification playbook scores pass.">
