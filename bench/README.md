# opencode Agent Benchmark Harness

Purpose: close the self-improvement loop for agent, command, skill, and routing changes.

Use `tasks/*.md` as small stable prompts. For each proposed setup change, run the relevant task(s) before/after when practical and append a compact row to `scorecard.md`.

Do not store secrets, raw proprietary snippets, billing data, or full logs here.

Minimum scorecard fields: date, change, task, model/agent, verification signal, pass/fail, wall-clock/tokens if measured, and residual risk.
