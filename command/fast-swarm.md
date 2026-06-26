---
description: Run a speed-budgeted intelligent swarm using cheap discovery lanes and strong synthesis/edit/review lanes.
agent: orchestrator
---

Run a speed-budgeted swarm for:

$ARGUMENTS

Rules:

1. If simple, single-file, or docs-only, do not spawn a multi-lane swarm: solve Rung 0 inline only when trivial, otherwise delegate to one specialist lane plus verification. Reserve swarm fan-out for >=3 independent subtasks with disjoint file zones.
1a. Use the `speed-acceleration` skill. This command is a speed-budgeted execution path, not just a fan-out path.
2. Invoking `/fast-swarm` counts as explicit bounded fan-out intent. Use GLM 5.2 for graph planning, cartography, spec, research, architecture, implementation, docs, memory, and verification summaries.
3. Keep GLM 5.2 on provider/default effort; do not request GLM high/max effort unless the task is demonstrably hard.
4. Escalate to GPT-5.5-fast only for top synthesis, security, VulcanCode config changes, repeated failures, or high-stakes ambiguity; use GPT-5.5-fast `low` effort by default.
5. Check `usage-accountant` before launch. Unknown/red usage -> focused capped lanes only; yellow -> small GLM-only waves; green -> normal cap 12 concurrent discovery lanes. High cap 32 only when clearly independent and usage allows.
6. If the usage ledger is fully unknown/stale/null, do not spawn a serial usage-accountant lane just to rediscover unknown; apply unknown policy directly and run a capped useful wave.
7. Use `pace_guard` when available. Declare phase budget, batch groups, speculative lanes, and starting verification tier before fan-out.
8. One editing lane per file ownership area.
9. Batch independent discovery/MCP reads in one turn and launch read-only lanes together; do not serialize discovery.
10. Verification ladder: T0 -> T1 required for non-trivial diffs; T2/T3 only if budget remains or risk requires it.
11. Max repair iterations: 5 via `loop_guard` unless the user explicitly asks for a smaller cap.
12. Never send secrets or irrelevant private code to remote MCPs.
13. Run a compact speed retro if the swarm is slow, blocked, or reveals a reusable acceleration lesson; update the speed ledger only for reusable non-secret findings.

Final response must include wall-clock speed choices, phase budget vs actual choices, model routing used, verification tier reached, speculative lanes launched/discarded, barrier escalations, speed lesson if any, and residual risk.
