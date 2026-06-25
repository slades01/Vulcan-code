---
description: Run a usage-aware 1000-node logical max swarm via bounded waves, five-layer nesting, smart synthesis, and strict safety gates.
agent: orchestrator
model: openai/gpt-5.5-fast
variant: low
---

Run a usage-aware 1000-node logical max swarm for:

$ARGUMENTS

Preflight is mandatory, but do not ask for approval:

0. Use the `speed-acceleration` skill. Max swarms must optimize useful wall-clock progress, not just node count.
1. Determine usage state. If the non-secret ledger is fully unknown/stale/null, do not spawn a serial `usage-accountant` lane just to rediscover unknown; apply `unknown_means` directly. Use `usage-accountant` only when the ledger has real remaining values, the user supplied fresh usage numbers, or the decision is not derivable from the ledger. If state is unknown, design the full wave path and execute the largest useful capped wave allowed by policy instead of asking for approval.
2. Treat invoking `/max-swarm` and the user's standing setup preference as explicit high-fan-out intent. Pass `approvedHighFanout=true`; pass `usageState=green` only when usage-accountant can actually classify it as green.
3. Build a graph with at least 5 layers when useful: orchestrator -> swarm-captain -> wave-coordinator/planning-lead -> research/build/verification lead -> specialist lane.
4. Declare fan-out count, per-wave node count, cumulative total node count, depth, model mix, file ownership, phase SLOs, verification gates, and stop conditions.
5. Prefer productive saturation: if the immediate goal has spare capacity, fill remaining useful wave capacity with adjacent discovery, review, security, performance, docs, dependency, and regression work.

Budgets when usage is green and `/max-swarm` was invoked:

- Target capacity: up to 1000 useful planned agent nodes per max-swarm run.
- Per-wave recommended cap: 128-256 planned read-only lanes plus reducer/synthesis nodes, staged in micro-batches of about 32 to avoid provider rate-limit thrash.
- Per-wave hard cap: 512 total nodes because graph tooling clamps there.
- Wave count: 2-8 waves as justified by independent work; barrier/reduce after every wave.
- Default true nesting depth: 5.
- Up to 5 repair iterations when verification is concrete.
- One editing lane per file ownership area.
- Per-wave wall-clock ceiling: default 10 minutes unless the user asks for deeper work. Reduce partial results at the ceiling instead of waiting for every slow lane.

Wave protocol:

- Use `wave-coordinator` to maintain a manifest with run id, wave id, node ids, mission hashes, file zones, model/cost class, dependencies, verification signal, and status.
- Persist the manifest when practical under `swarm/<run_id>/manifest.json`; otherwise return it in the wave output for the orchestrator to preserve.
- Before launch, merge duplicate mission hashes and split only genuinely independent shards.
- Launch lanes in micro-batches. On repeated 429/timeout/provider errors, halve batch size and retry failed lanes once before classifying as environment failure.
- After each wave, run two-tier synthesis/reduce when lane count exceeds about 32, collapse duplicate findings, audit changed files against ownership zones, update the manifest, and decide whether another wave adds new intelligence.
- Stop early if new waves become duplicate, speculative, time/usage-budget-unsafe, or lack a concrete verification target.
- At each barrier, abandon unresolved speculative read-only lanes past 1.5x SLO to assumptions/risks unless they report a concrete safety issue.

Budget behavior:

- Spend quota on useful independent exploration, adversarial review, benchmark variants, and verification confidence.
- Do not waste quota on duplicate lanes or speculative loops.
- Use GLM 5.2 for bulk discovery, architecture, debugging, implementation, verification, review, performance, docs, and memory; reserve GPT-5.5-fast for top synthesis, security, vulcan config changes, agent evaluation, and hard ambiguity.
- Maintain a next-wave backlog so max-autonomy can continue improving projects without starting a separate session.
- After each max-swarm run, run a speed retro and update the speed ledger with reusable non-secret acceleration lessons.

Stop on denied tools, out-of-scope destructive/credentialed actions, repeated same failure twice, unknown verification, duplicate waves, or a request that exceeds the useful budget for the goal.
