---
description: Execute a SOTA agentic coding workflow using graph planning, SPARC/GOAP-style decomposition, MCP research, loops, and review gates.
agent: orchestrator
---

Execute the most rigorous practical agentic coding workflow for:

$ARGUMENTS

Use this stack:

1. Graph: create a visible agent node map and dependency DAG.
2. Spec: acceptance criteria, non-goals, edge cases, test matrix.
3. Context: repo cartography, local conventions, external docs via Context7 when useful, examples via gh_grep when useful.
4. Architecture: minimal durable design and integration plan.
5. Loop: bounded implementation loop using `loop_guard` with a concrete verification target.
6. Build: smallest correct edits, preferably test-first.
7. Verify: focused tests/build/lint/browser checks.
8. Red team: review, security, performance, and regression scan.
9. Memory: capture durable learnings only if they will help future sessions.

Keep parallel lanes independent. Do not run multiple editing lanes against the same files.
