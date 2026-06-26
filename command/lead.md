---
description: Strict team-lead mode. Orchestrator plans, dispatches, and verifies while specialist lanes author implementation diffs.
agent: orchestrator
---

Enter strict team-lead mode for:

$ARGUMENTS

Contract:

1. Do not write implementation diffs in the orchestrator context. Route code changes to `implementation-lane` (clear implementation), `tdd-engineer` (correctness/regression), or `optimization-lane` (performance/math). Rung 0 edits and VulcanCode setup edits remain allowed.
1a. Use the `speed-acceleration` skill as the wall-clock operating doctrine.
1b. Prime context before dispatch: relevant `AGENTS.md`, configured references, memory indexes, compact handoff docs, and speed-ledger lessons. Keep recall bounded and non-secret.
2. Run graph-planner and R&D before build for unfamiliar, risky, cross-cutting, security, data-integrity, or performance/math work: `graph-planner`, `research-lead` + `system-architect`, plus `performance-engineer`/`algorithmic-mathematician` when optimization or numerics are in scope. Require a compact spec artifact before edit lanes touch Rung 2+ file zones.
3. Every non-trivial diff gets independent `verification-lane` and `review-lane` coverage before final.
4. Declare per-phase SLO and per-lane latency cap before dispatch. Use `pace_guard` when available. At each barrier, abandon any read-only lane past 1.5x SLO to an assumption/risk instead of blocking; reroute once only if it is likely to save time.
5. After an edit lane completes, fork-join `verification-lane` and `review-lane` concurrently when both are relevant, then synthesize once.
6. Use `loop_guard` for repair loops; cap at 5 iterations; classify failures as current-change, pre-existing, environment, or unknown.
7. Apply the escalation ladder. Fan out only on Rung 3 triggers or explicit user request. Anti-waste still applies to swarm size.
8. If a lane is blocked by denied tools, missing facts, destructive next steps, or missing verification, reroute, gather one safe diagnostic, or stop with a handoff. Do not silently absorb the lane's work into the orchestrator context.
9. After Rung 2+ or slow work, run a compact speed retro and record reusable non-secret lessons in the speed ledger.

Final response: plan, lanes dispatched with mission and file zone, phase budget vs actual choices, verification tier/evidence, fan-out actually used, speed lesson if any, and residual risk.
