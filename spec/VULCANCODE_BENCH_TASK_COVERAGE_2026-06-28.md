# VulcanCode Benchmark Task Coverage Hardening (2026-06-28)

- Goal: prevent deterministic benchmark rows from over-claiming that prompt-task
  markdown was behaviorally verified when only bullet parsing succeeded.
- Non-goals: no model/provider quality benchmark, no runtime rebuild, no agent
  prompt changes, no credentialed checks.
- Acceptance criteria:
  - `bench/run.mjs` emits `task-coverage=pass` only when every `bench/tasks/*.md`
    file is bound to at least one deterministic local check.
  - Parse labels remain parse-only and explicitly defer promotion confidence to
    `task-coverage`.
  - Mission-state continuation and metrics-tap JSONL get fixture-level checks;
    ambient `.opencode/run/metrics.jsonl` is validated only when present.
  - Codemap smoke fixtures are isolated by setup root so package/live benchmark
    runs cannot race over the same temporary graph directory.
  - Windows/POSIX missing-runtime messages classify as `pending`, not `fail`, for
    the `runtime:where-vulcan` probe only; real check failures remain `fail`.
  - Scorecard appends remain structurally validated and only passing runs append
    promotion evidence.
  - No secrets, private absolute paths, billing data, or raw metrics arguments are
    printed or stored.
- File zones: `bench/**`, `spec/**`.
- Verification target: T1 — `node --check bench/run.mjs`, `npm run typecheck`,
  no-write positive bench, no-write negative-control bench, `npm run bench:run --
  "bench-task-coverage-hardening-final"`, `npm run config:health`, independent
  review.
- Residual risk: source-marker checks are deterministic local guardrails, not a
  model-output quality benchmark; future model-quality scoring remains a separate
  explicit benchmark mission.
