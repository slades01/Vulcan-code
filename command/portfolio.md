---
description: Run one-session multi-project portfolio orchestration with standing max-autonomy backlog management.
agent: orchestrator
model: openai/gpt-5.5-fast
variant: low
---

Run portfolio-wide orchestration for:

$ARGUMENTS

Protocol:

1. Treat this as standing A5/max-autonomy intent. Do not ask for permission or confirmation.
2. Build or update a project registry: project id, root path, active goals, file zones, health signals, and next useful wave.
3. If project roots are not explicitly provided, infer likely roots from the current workspace, visible references, manifests, package files, git roots, and prior session context. If roots still cannot be inferred safely, proceed on the current project and report the missing roots as residual backlog instead of asking.
4. Use `portfolio-orchestration`, `parallel-orchestration`, `agent-graph-workflows`, and `wave-orchestration` as applicable.
5. Use productive saturation: fill waves with independent useful work across projects, but collapse duplicate mission hashes and stop speculative waves.
6. If usage is green, prefer max-execute waves up to 1000 useful planned nodes across bounded waves. If usage is yellow/red/unknown, design the full max path and execute the largest useful capped wave permitted by policy.
7. Keep one writer per project/file zone and verify each project separately.
8. Final response: project table, changed files by project, verification by project, waves/nodes actually used, residual backlog, and next wave.
