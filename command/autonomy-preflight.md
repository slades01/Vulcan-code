---
description: Produce a usage-aware autonomy contract with fan-out, nesting depth, model routing, safety gates, and verification before executing.
agent: orchestrator
model: openai/gpt-5.5-fast
variant: low
---

Create an autonomy preflight for:

$ARGUMENTS

Return a decision-ready contract:

1. Goal, scope, non-goals, and acceptance criteria.
2. Autonomy level: A0 read-only, A1 plan, A2 approved edits, A3 bounded loop, A4 high swarm, or A5 max swarm.
3. Usage state: green, yellow, red, or unknown. If unknown and the requested run is high-cost, choose the smallest useful execution shape instead of asking for approval.
4. Fan-out budget, total node budget, and true nesting depth. Ensure at least 5 layers when requested.
5. Model routing: GLM 5.2 workhorse lanes vs GPT-5.5-fast top-reasoning lanes.
6. Tool/MCP risk and data-egress limits.
7. File ownership locks and editing lane limits.
8. Verification target, stop conditions, max iterations, and failure classification.
9. Recommendation: proceed, reduce scope, or block with a concise reason.

Do not edit files during preflight.
