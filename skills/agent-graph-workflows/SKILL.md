---
name: agent-graph-workflows
description: Use ONLY when building visual node maps, DAGs, hierarchies, swarms, GOAP plans, SPARC flows, map-reduce lanes, or multi-agent execution graphs.
---

# Agent Graph Workflows

Use this skill when work should be represented as a map of agent nodes.

## Topologies

- Hierarchy: one queen/router delegates to specialist nodes. Best default for coding work.
- DAG: explicit dependencies. Best when some findings must precede edits.
- Map-reduce: many research lanes feed one synthesis lane. Best for broad discovery.
- Pipeline: ordered gates. Best for releases, migrations, and compliance tasks.
- Debate: competing design lanes feed a synthesis lane. Best for high-impact architecture choices.
- Mesh: peer coordination. Use rarely; keep it read-only unless file ownership is clear.
- SPARC: spec, pseudocode/design, architecture, refinement, completion. Best for rigorous feature delivery.
- Adaptive triad: Thinker -> Worker -> Verifier. Best when a task is uncertain but does not justify broad fan-out.
- Recursive coordinator: a coordinator node spawns a bounded child graph for a distinct subproblem, then returns one reducer output. Use only when decomposition creates new independent work.

## Role Classes

- Thinker: proposes hypotheses, designs, decomposition, or test strategy.
- Worker: executes bounded research, implementation, experiments, or documentation.
- Verifier: falsifies claims, runs tests, reviews security/performance/regression risk.
- Reducer: merges lane outputs, deduplicates collisions, resolves conflicts, and chooses the next action.
- Coordinator: owns a nested subgraph with explicit depth, budget, and stop conditions.

## Node Contract

Each node needs:

- Node id.
- Agent name.
- Role class.
- Mission.
- Inputs.
- Outputs.
- Dependencies.
- Permissions.
- Verification signal.
- Stop condition.

## Execution Rules

- Run independent read-only nodes in parallel.
- Synthesize before editing.
- Use one editing lane per file ownership area.
- Run verification and review after edits.
- Keep a visible loop contract for autonomous repair work.
