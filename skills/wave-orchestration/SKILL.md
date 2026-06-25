---
name: wave-orchestration
description: Use ONLY when requests mention 1000 agents, max swarm, massive swarm, high fan-out, bounded waves, wave manifest, or benchmark-scale multi-agent execution.
---

# Wave Orchestration

Use this skill for max-scale swarms that need more breadth than a single graph/tool call can safely carry.

## Core Contract

- Treat 1000 agents as a logical swarm-run capacity across bounded waves.
- Keep each wave at or below the graph/tool hard clamp of 512 nodes; prefer 128-256 planned read-only lanes staged in micro-batches of about 32 when usage is green.
- Use barriers: launch wave, collect all lanes, synthesize/reduce, deduplicate, audit file ownership, then decide whether another wave is useful.
- Stop early when new waves duplicate prior findings, lack verification, or add cost without intelligence.
- Every wave should have an explicit role mix. Spend extra nodes on independent evidence, adversarial verification, benchmark variants, or reducer confidence rather than duplicate Worker lanes.
- In standing max-autonomy mode, keep a living backlog across projects and waves. Use all useful capacity on independent discovery, implementation, review, and verification, but never fabricate work just to hit a node count.

## Wave Manifest

Track this for every max swarm:

- `run_id`, `wave_id`, `usageState`, and selected mode.
- `total_planned_nodes`, `wave_node_count`, and `cumulative_completed_nodes`.
- Node id, agent, mission, `mission_hash`, model, cost class, dependencies, status, and verification signal.
- Role class: Thinker, Worker, Verifier, Reducer, or Coordinator.
- Project id/root for portfolio runs.
- File-ownership zones and edit leases.
- Reducer output, conflicts, residual verification gaps, and next-wave decision.
- Persist the manifest in a run-scoped scratch path such as `swarm/<run_id>/manifest.json` when practical; otherwise return the complete manifest to the orchestrator.

## Dedup and File Ownership

- Merge lanes with colliding mission hashes before launch unless they are explicitly adversarial variants.
- Partition edit work into disjoint path/glob zones.
- Use one editing lane per zone regardless of swarm size.
- After every editing wave, audit the diff against leased zones before the next wave.

## Model Routing

- GLM 5.2: bulk discovery, cartography, spec shards, architecture shards, implementation, TDD, debugging, verification, review, performance, docs, memory.
- GPT-5.5-fast: top orchestration, wave coordination, final synthesis, security, opencode config changes, agent evaluation, ambiguous failures, and high-stakes decisions.
- Mini-fast: title/summary only.
- For high-confidence waves, reduce correlated blind spots by mixing role types and, where useful, model families: one workhorse lane can be paired with a stronger verifier/synthesis lane instead of more identical workers.

## Verification Gates

1. Plan gate: depth, node counts, unique mission hashes, file zones, and per-wave cap.
2. Lane gate: each lane returns its declared verification/evidence signal.
3. Synthesis gate: reducer collapses duplicates and resolves conflicts.
4. Scale gate: waves above about 32 lane outputs use GLM 5.2 shard reduction before GPT-5.5-fast final synthesis; leaf outputs default to roughly 400 tokens.
5. Edit gate: all edits are inside leased zones.
6. Confidence gate: targeted tests/build/lint/browser/security/performance checks as relevant.

Do not spend agents just to use quota. Spend them on independent evidence, adversarial review, benchmark variants, and verification confidence.
