---
name: bounded-agent-loops
description: Use ONLY when requests mention loop, autofix, keep going, until tests pass, autonomous, self-heal, retry, iterate, repair, or run until done; requires a verification target.
---

# Bounded Agent Loops

Use this skill for autonomous coding loops that must stay safe and useful.

## Required Loop Contract

Before looping, define:

- Goal.
- Verification target.
- Maximum iterations.
- Stop conditions.
- Failure classification rules.
- Escalation conditions.

## Default Stop Conditions

- Verification passes.
- Acceptance criteria are met.
- Max iterations reached.
- Same failure repeats twice without new evidence.
- Next step is destructive, credentialed, expensive, or broader than the request and not directly required by the user's goal.
- A tool call is denied; stop and report instead of finding a workaround.
- Required information is missing and guessing would create risk.

## Iteration Shape

1. Observe current state.
2. Decide one concrete next action.
3. Act with the smallest safe change or diagnostic.
4. Verify against the target.
5. Classify the result.
6. Record what changed and what remains.

## Failure Classes

- Current-change regression: fix before continuing.
- Pre-existing failure: document evidence and avoid expanding scope unless the user's goal already covers it.
- Environment failure: report missing dependency, service, credential, or platform issue.
- Unknown: gather one safe diagnostic if it will reduce uncertainty.
