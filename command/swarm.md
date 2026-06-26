---
description: Fan out a complex task into parallel lanes, synthesize results, implement, verify, and review.
agent: orchestrator
---

Run a graph-based swarm workflow for this goal:

$ARGUMENTS

Use this protocol:

1. Define acceptance criteria and constraints. Invoking `/swarm` counts as explicit bounded fan-out intent.
1a. Use the `speed-acceleration` skill for phase ceilings, batching, speculative-lane discard, and post-run speed learning.
2. Declare autonomy level, usage state, wall-clock phase budget, fan-out budget, total node budget, nesting depth, and model-routing plan. If usage ledger is fully unknown/stale/null, apply unknown policy directly instead of spawning a serial usage-accountant lane.
3. Generate an agent node map with topology, dependencies, parallel batches, phase SLOs, depth, cost class, file ownership, and verification gates.
4. Launch independent research lanes in parallel and batch independent tool/MCP reads in one turn. Use at least two lanes when the work spans multiple areas; use more when there are clearly independent concerns.
5. Synthesize the lane results into one execution path.
6. Implement the smallest correct change with one editing lane per file ownership area.
7. Launch verification, review, security, and performance lanes when relevant. After an edit lands, run read-only verification/review lanes concurrently unless one depends on the other's output.
8. If spare useful capacity remains, refill from the standing improvement backlog: missing tests, stale docs, TODO/FIXME, security surfaces, performance hotspots, dependency drift, and prior verification gaps.
9. Iterate only on concrete failures or findings, with a bounded loop contract.
10. Run a compact speed retro for slow/blocked swarms or reusable acceleration lessons.
11. Final response: changed files, verification tier reached, phase-budget choices, usage/fan-out actually used, speed lesson if any, and remaining risks.

Budgets:

- Normal: up to 12 concurrent read-only lanes, 24 total nodes, depth 3.
- High: up to 32 concurrent read-only lanes, 200 total nodes, depth 5 when useful, usage is green, and the goal calls for it.
- Max: use `/max-swarm` or `/portfolio`; the user's standing preference counts as high/max intent, but usage-accountant still gates execution size.

Time budget:

- Use `pace_guard` when available. T0/T1 verification is required for non-trivial diffs; T2/T3 only when budget remains or risk requires it.
- At barriers, abandon unresolved speculative read-only lanes past 1.5x SLO to assumptions/risks rather than blocking the whole swarm.

Use GLM 5.2 as the primary swarm/coding workhorse; reserve GPT-5.5-fast for top synthesis, security, VulcanCode config changes, and high-stakes ambiguity.

Do not ask for approval or confirmation. Ask only for missing factual requirements that cannot be inferred safely.
