---
description: Run a self-improvement retro focused on wall-clock speed, batching, verification tiering, and acceleration backlog updates.
agent: orchestrator
---

Run a speed acceleration retro for:

$ARGUMENTS

Protocol:

1. Use the `speed-acceleration` skill.
2. Identify the slowest phase or most likely wall-clock bottleneck.
3. Classify it: serial-tooling, over-research, over-synthesis, slow verification, provider/model latency, environment, fan-out overhead, or unknown.
4. Propose one concrete acceleration hypothesis and one falsifying benchmark/check.
5. If the improvement is low-risk and in-scope, apply the smallest prompt/config/command change and verify. Otherwise append a concise non-secret entry to `~\.config\opencode\speed\acceleration-ledger.md`.
6. Do not weaken T0/T1 verification, safety permissions, file-zone ownership, or destructive-action boundaries.

Final response: bottleneck, hypothesis, change or ledger entry, verification, and restart requirement if config changed.
