---
description: "Run a test-first swarm: spec, repo map, failing test, implementation, verification, review."
agent: orchestrator
---

Run a TDD swarm for:

$ARGUMENTS

Protocol:

1. Spec analyst defines behavior, edge cases, and test matrix.
2. Context cartographer finds existing tests and conventions.
3. TDD engineer creates the smallest failing regression test.
4. Implementation lane makes the smallest code change to pass.
5. Verification lane runs focused tests, then broader checks if justified.
6. Review lane checks for regressions and missing coverage.

If the codebase lacks a usable test harness, report that and use the closest executable verification instead.
