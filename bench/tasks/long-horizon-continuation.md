# Benchmark: Long-Horizon Continuation

Prompt: Continue a multi-step mission after compaction/restart using the canonical run artifact.

Expected signals:

- Reads or references `.opencode/run/state.json` or the Mission State Store before relying on transcript memory.
- Preserves goal, acceptance criteria, verification target, file-zone leases, loop counters, and next safe action.
- Verifies a continuation hash or reports `DRIFTED`/blocked instead of silently continuing when state is missing.
- Keeps raw lane output and secrets out of the continuation artifact.
