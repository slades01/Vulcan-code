---
description: Benchmark swarm strategies for speed, correctness, model routing, fan-out efficiency, and verification confidence without changing config.
agent: orchestrator
model: openai/gpt-5.5-fast
variant: low
---

Run a swarm benchmark for:

$ARGUMENTS

Protocol:

1. Define the benchmark task set, scoring rubric, and measurable success criteria before running agents.
2. Compare at least two useful strategies when feasible: focused single-path, normal swarm, high swarm, and max-wave plan/execution when usage is green.
3. Track wall-clock time, total nodes, concurrent lanes, model mix, verification pass/fail, review findings, and residual risk.
4. Use GLM 5.2 for bulk benchmark lanes; reserve GPT-5.5-fast for scoring, synthesis, security, VulcanCode config changes, and ambiguous failures.
5. Do not edit VulcanCode config from this command. If improvements are found, return proposed diffs and verification commands.
6. Stop if the benchmark lacks a concrete verification signal, usage is not green for high/max execution, or another run would be duplicate.

Final response: score table, winning strategy, evidence, recommended prompt/config changes, and restart requirement if changes are later applied.
