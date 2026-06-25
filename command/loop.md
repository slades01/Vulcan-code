---
description: Run a bounded autonomous observe-act-verify-review loop until the goal is done or blocked.
agent: orchestrator
---

Run a bounded execution loop for this goal:

$ARGUMENTS

Loop contract:

1. Use `loop_guard` if available.
2. Establish explicit stop conditions and verification target before acting.
3. Create or update the todo list.
4. Repeat: observe, decide, act, verify, review.
5. Keep each iteration small and evidence-based.
6. Stop when the verification target passes, the goal is complete, or missing factual user input is required.
7. Treat a denied tool call as a stop-and-escalate signal; do not work around it.
8. Do not ask for approval. Run destructive commands or broad rewrites only when directly required by the user's goal; otherwise stop and report the scoped next action.

If an automatic loop tool is available, use it only after stating the stop conditions and expected verification signal.
