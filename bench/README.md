# VulcanCode Agent Benchmark Harness

Purpose: close the self-improvement loop for agent, command, skill, and routing changes.

Use `tasks/*.md` as small stable prompts. For each proposed setup change, run the relevant task(s) before/after when practical and append a compact row to `scorecard.md`.

Do not store secrets, raw proprietary snippets, billing data, or full logs here.

Minimum scorecard fields: date, change, task, model/agent, gate mode, verification signal, pass/fail, wall-clock/tokens if measured, and residual risk.

Promotion evidence requires a machine-readable gate mode. Rows with
`gate_mode=executable` in the verification signal are deterministic local gate
runs. Rows with `manual-evidence` may count only when their verification signal
lists explicit T0/T1 commands. Rows under "Historical — prompt-only, not
promotion evidence" are retained for provenance but must not be used as
promotion evidence.

Run the deterministic local no-regression gate with:

```powershell
npm run bench:run -- "<change label>"
```

The runner parses every `tasks/*.md` expected-signal list and executes the T1
setup/codemap checks that are safe in a local non-secret environment. The
`parse:*` labels prove only that task markdown is well-formed; promotion depends
on `task-coverage=pass`, which binds every task to at least one deterministic
local check. It appends a scorecard row only for a fully passing run. If a
required local check is unavailable, the result is `pending`; if a check fails,
the result is `fail`. It does not call model or provider APIs.

Independent read-only checks run in parallel (the vulcan config checks, plus the
`codemap:bench`, `recall:golden`, helper-tool/source guardrails,
continuation/metrics fixtures, and `helper-tools` presence check). Check labels
and order stay deterministic; each check's per-run timing is recorded in the
verification signal as `label=status@Nms`.

Portability rules:

- `helper-tools` presence is checked by file existence only — never by a
  host-specific absolute path or branded runtime version.
- Live-identity checks (`identity:vulcan-version-1.x` and the shim target) are
  opt-in via `VULCAN_BENCH_LIVE_IDENTITY=1`; they are off by default so the
  package gate is portable.
- The `mission-state:continuation-hash` check **passes/skips** when
  `.opencode/run/state.json` is absent; it only fails when state exists but is
  corrupt or missing its continuation hash.
- The metrics tap check validates a synthetic JSONL fixture every run and, when
  `.opencode/run/metrics.jsonl` exists, validates the last ambient rows without
  printing raw tool arguments.

False-promotion controls:

- `task-coverage` fails/pends the gate if a task is parse-only or its bound
  deterministic check is missing, failed, or unavailable.
- Scorecard appends are structural-validated and pass-only. Negative-control,
  failing, and pending runs print their row but do not add promotion evidence.

`npm run bench:recall` runs the recall-bus golden test
(`bench/recall-golden.mjs` + `bench/fixtures/recall/`) — synthetic-secret
redaction invariants, frozen cross-source relevance/hit@3 triples, and a real
temporary `recall_bus` execution proving current `spec/VULCANCODE_*.md` files can
surface as `rnd-spec` hits.

Negative-control smoke for the gate itself:

```powershell
$env:VULCAN_BENCH_NO_SCORECARD='1'; $env:VULCAN_BENCH_NEGATIVE_CONTROL='1'; npm run bench:run -- "negative-control"
```
