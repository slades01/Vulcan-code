---
description: Temporarily use conservative pre-ultra behavior for the current request while keeping safety and verification gates.
agent: orchestrator
---

For this request, use conservative pre-ultra behavior:

$ARGUMENTS

Request-local override only: do not mutate config or rewrite the agent's configured model effort. Keep trusted-autonomy, secret/destructive denies, and T0/T1 verification for non-trivial diffs. Prefer Rung 0 inline and Rung 1 one-lane execution; use Rung 2+ only when risk, ambiguity, cross-cutting scope, or explicit user request justifies it. Do not run high/max swarms unless explicitly requested. To stay conservative across multiple turns, invoke `/ultra-off` again or explicitly restate conservative/solo mode.

Report briefly in the final answer that `/ultra-off` conservative mode was used.
