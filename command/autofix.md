---
description: Run a bounded fix-verify loop against a failing command, test, build, lint, or reproduction.
agent: orchestrator
---

Run a bounded autofix loop for:

$ARGUMENTS

Protocol:

1. Identify the verification command or observable pass condition from the arguments. If missing, infer the smallest focused check or ask one question before editing.
2. Create a `loop_guard` contract with max 5 iterations by default.
3. Reproduce the failure before editing when feasible.
4. Diagnose root cause with a debugger lane if unclear.
5. Make the smallest safe change.
6. Run the verification target.
7. Classify failures after each attempt: current-change, pre-existing, environment, or unknown.
8. Stop on pass, repeated same failure twice, unsafe next step, denied tool call, or max iterations.
9. Final response: loop iterations, changed files, verification result, and remaining risk.
