---
description: Run a parallel code review focused on regressions, safety, tests, and maintainability.
agent: orchestrator
---

Run a parallel review for:

$ARGUMENTS

Use read-only lanes. Review the relevant diff or files from multiple angles: correctness, edge cases, security/safety, tests, and maintainability. Use `review-lane` for the primary GLM review path. When independent model diversity is required, reroute once to a reliable GPT/security review lane rather than using unreliable free-tier models or pretending diversity happened.

Return findings first, ordered by severity, with file and line references where possible. If there are no findings, state that clearly and list remaining risks or unverified areas.
