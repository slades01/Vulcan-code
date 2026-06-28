# Changelog

All notable changes to this package are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/) (with an `-fast` pre-release suffix tracking the
opencode runtime).

## [Unreleased]

### Changed — Scorecard executable gate signal hardening (2026-06-28)
- `bench/run.mjs` now rejects executable scorecard rows whose verification signal
  lacks `gate_mode=executable`, closing a validator gap where a row could set
  `Mode=executable` while carrying only prose/manual evidence.
- The scorecard validator now rejects any non-passing executable row, not just
  the newest row, and the self-test includes both missing-gate and older-fail
  negative cases so future benchmark runs fail closed before appending promotion
  evidence.
- Historical scorecard rows are now checked separately: only
  `prompt-only-historical` and `failed-executable-historical` modes are allowed
  below the historical heading, so promotable-looking executable/manual rows
  cannot be hidden there.
- Historical rows now also require a non-empty mode and the expected column
  count, closing structural gaps that could otherwise hide malformed provenance
  rows below the historical heading.
- The historical heading detector now tolerates dash/wording variants that still
  say `not promotion evidence`, so a manual punctuation edit cannot silently
  disable historical-section validation.

### Changed — Recall spec source coverage (2026-06-28)
- `tools/recall_bus.ts` now enumerates all `spec/VULCANCODE_*.md` files under the
  selected setup root instead of reading only the historical
  `VULCANCODE_RND_2026-06-27.md` file, so newer recall/benchmark specs are
  discoverable by the advertised `rnd-spec` source.
- `bench:recall` now runs the actual `recall_bus` tool against a temporary setup
  root with multiple spec files, and `bench/run.mjs` adds a
  `recall-bus:spec-source` guardrail so this does not silently regress.
- Added `spec/VULCANCODE_RECALL_SPEC_SOURCE_2026-06-28.md` documenting the
  acceptance criteria and restart note for runtime-loaded tool changes.

### Added — Package parity + fast bench gate (2026-06-28)
- Ported the non-secret live helper tools into the package so in-package users
  get the same workflow capabilities: `tools/mission_state.ts` (one-writer
  file-zone leases + continuation state), `tools/recall_bus.ts` +
  `tools/recall_bus_lib.mjs` + `tools/recall_bus_lib.d.mts` (tiered redacted
  retrieval), `tools/synthesis.ts` (convergence helper), and
  `plugins/metrics-tap.ts` (non-secret `.opencode/run/metrics.jsonl` event tail).
- `bench/recall-golden.mjs` + `bench/fixtures/recall/{redaction,relevance}.json`
  — recall-bus golden test: synthetic-secret redaction invariants and frozen
  cross-source relevance/hit@3 triples. Wired as `npm run bench:recall`.
- Benchmark tasks `long-horizon-continuation.md`, `lease-conflict.md`,
  `swarm-converge.md`, and a portable `helper-tools-present.md` presence task.

### Changed — Package parity + fast bench gate (2026-06-28)
- `bench/run.mjs` now parallelizes the independent read-only vulcan checks and
  the `codemap:bench` / `recall:golden` / `helper-tools` batch; check labels and
  order stay deterministic and each check records per-run timing in the
  verification signal as `label=status@Nms`. Added `recall:golden` and
  `helper-tools` presence checks. Live-identity / dist-next shim checks are now
  opt-in via `VULCAN_BENCH_LIVE_IDENTITY=1`. A missing
  `.opencode/run/state.json` continuation state passes/skips (only fails when
  state exists but is corrupt/missing its hash). Negative control still forces
  failure.
- Synced `tools/agent_graph.ts` (graph partitioning + `maxNodes`),
  `tools/loop_guard.ts`, `tools/pace_guard.ts` (optional metrics-tail verdicts),
  and `plugins/swarm-compaction.ts` (state.json continuation snapshot) from the
  live setup.
- `tools/recall_bus.ts` default setup root is a portable
  `path.join(os.homedir(), ".config", "opencode")` — no hardcoded per-user path.
- `config/opencode.example.jsonc` documents the helper tool permissions
  (`loop_guard`, `pace_guard`, `synthesis`, `recall_bus`, `mission_state`) and the
  commented plugin block including `metrics-tap.ts`.
- README, `bench/README.md`, and `spec/VULCANCODE_PACKAGE_PARITY_2026-06-28.md`
  document the wave, verification, and restart requirement.

### Changed — Benchmark task coverage hardening (2026-06-28)
- `bench/run.mjs` now treats `parse:*` task checks as parse-only and requires
  `task-coverage=pass` before a benchmark row can count as promotion evidence.
  Each task is bound to at least one deterministic local check.
- Added fixture checks for Mission State continuation hashes and metrics-tap
  JSONL schema, plus ambient metrics validation when `.opencode/run/metrics.jsonl`
  exists. Raw metrics arguments are never printed.
- Scorecard appends are pass-only and revalidate the actual rendered row before
  writing; negative-control/failing/pending runs print evidence but do not append
  promotion rows.
- Runtime-unavailable detection is scoped to `runtime:where-vulcan` so real
  deterministic check failures cannot be mislabeled as environment `pending`.
- `bench/codemap-smoke.mjs` isolates its temporary fixture by setup root to avoid
  package/live benchmark races.
- Added `spec/VULCANCODE_BENCH_TASK_COVERAGE_2026-06-28.md` documenting the
  acceptance criteria and residual non-goals.

### Added
- **Code Memory** — a Cognee-like local code-graph overlay (deterministic
  Extract → Cognify → Load) that scans a repo and persists files/symbols/edges
  into `.opencode/codemap/{nodes.jsonl,edges.jsonl,manifest.json}`, enabling
  structural recall from a precomputed graph instead of rebuilding cartography
  every task.
  - `tools/codemap/lib.mjs` — pure Node ESM engine (no external deps). Exports
    `generateCodemap`, `recallCodemap`, `healthCodemap`, `benchCodemap`.
    Deterministic output ordering and reproducible canonical digests; atomic-ish
    temp-file-then-rename writes.
  - `tools/codemap/{generate,recall,health,bench}.mjs` — CLI wrappers
    (`--root`, `--out`, `--query`, `--limit`).
  - `tools/code_memory.ts` (`code_memory` tool: op = `generate|recall|health|bench`,
    dynamic-imports the engine) and `tools/codemap_health.ts` (`codemap_health`
    quick health tool).
  - `tools/codemap/lib.d.mts` — type declarations so the plugin tools typecheck.
  - Node/symbol/edge provenance: `repoRoot`, `path`, `startLine`/`endLine`,
    `sourceHash` (sha256 of owning file), `mtimeMs`, `capturedAt`, `capturedBy`,
    `status`. Edge types: `defines`, `imports` (resolved + unresolved
    `targetStatus`), `calls`, `documents`.
  - Secret-safe by construction: credential-like paths/patterns are excluded from
    scanning; file content is scanned (AWS/OpenAI/GitHub/Slack/Stripe keys, bearer
    tokens, private-key blocks, obvious secret assignments) before any
    snippet/doc/signature is persisted; suspected secrets are redacted and never
    written. Placeholder values like `{env:NAME}` are exempted.
  - `agent/code-memory-curator.md` (safe curation guidance), `command/codemap.md`
    (command wrapper), and `spec/codemap.md` (data model, safety, performance,
    verification).
  - `npm run codemap:{generate,health,recall,bench}` scripts.
- `.gitignore` now excludes `.opencode/` (generated overlay / runtime output).

### Changed — Code Memory richer parsers (v1.1)
- `tools/codemap/lib.mjs` Cognify now uses **optional real parsers**, discovered
  once per process and fully degrading to the v1 regex extractors:
  - **JS/TS family** is parsed with the TypeScript compiler API when a trusted
    engine-local `typescript` resolves (`ts.createSourceFile`, pure parse). New `symbolKind` values:
    `method`, `accessor` (get/set), `interface`, `type` (alias), `enum`,
    `namespace`, and `const`/`export` variable bindings; constructors are tagged
    `method`. Imports now include side-effect (`import "./x"`) and re-export
    (`export ... from`) specs. Call sites are direct `Identifier` callees. Real
    `startLine`/`endLine` spans, declaration-head signatures, and leading-comment
    docs are extracted.
  - **Python** can be parsed with the stdlib `ast` module via a short-lived spawned
    process only when `VULCAN_CODE_MEMORY_PYTHON` points to an absolute trusted
    Python 3 binary. Content is passed as JSON over **stdin
    bytes** (`sys.stdin.buffer.read()` + `json.loads`), decoded UTF-8 regardless
    of host locale, with a leading UTF-8 BOM tolerated. Extracts `function`/`async
    def`, `class`, methods (by parent), imports, direct Name call sites, real
    `lineno`/`end_lineno`, and docstrings. A per-file `SyntaxError` falls back to
    a richer indentation-aware regex for that file only; without the env var,
    Python uses that safe regex fallback by default.
- `assignEndLines` now preserves real parser spans; only regex symbols get the
  "until next symbol" approximation. The local `calls` resolver treats
  `function`, `method`, and `accessor` as callables.
- `manifest.json` gains a `parsers` field (`typescript`/`python` availability +
  version/bin + per-file `usage` counts), surfaced in the `generate` markdown. It
  records environment/availability and does not feed node/edge digests, so it
  cannot break reproducible canonical integrity.
- Safety preserved: parsers run only after the secret scan, on already-read
  content, inside the validated root/out guards; no network; the Python helper
  never touches the filesystem.
- `tools/codemap/lib.d.mts` adds optional `CodemapParserInfo`/`CodemapParserUsage`
  types on `CodemapManifest.parsers`.
- `spec/codemap.md` (status v1.1; extraction, kinds, edge cases), README Code
  Memory section, and this changelog updated to describe the AST upgrade.

### Changed
- `command/memory-recall.md` uses `code_memory` recall (when available) after the
  markdown recall pass and surfaces stale/missing codemap status.
- `agent/memory-curator.md` and `agent/orchestrator.md` prime recall with the
  structured code graph (`code_memory`/`codemap_health`) when code structure/file
  impact is relevant, before broad cartography.
- `config/opencode.example.jsonc` documents optional `./tools/code_memory.ts` and
  `./tools/codemap_health.ts` plugin entries plus `code_memory`/`codemap_health`
  allow permissions.
- README "What's included" tools row and a new Code Memory subsection; README
  verification notes the codemap CLI gate.

### Added

- Synced the public package metadata and sanitized snapshot archive to the live
  VulcanCode runtime version `0.0.0-dev-202606261805`.
- `skills/ultra-default/SKILL.md` documents VulcanCode's UltraCode-inspired
  workflow-by-default behavior: high-effort orchestration, delegated lanes,
  bounded fan-out, adversarial verification, and T0/T1 safety gates.
- `/ultra` and `/ultra-off` commands make the default mode explicit or provide a
  request-local conservative override without mutating config.

### Changed
- `vulcan --version` / `vulcan -v` now reports VulcanCode's own brand and
  version (`VulcanCode 1.0`) instead of forwarding `--version` to the opencode
  runtime (which printed `opencode <version>`). Brand and display version are
  read from `package.json` (`vulcan.brand` / `vulcan.displayVersion`), and the
  check runs before runtime resolution so it works even when the runtime is not
  installed. Non-version arguments still forward to the runtime unchanged.
- Mirrored the running VulcanCode agent, command, skill, and benchmark prompt
  updates into the public repo with local paths and private host details
  sanitized.
- Example config and quickstart now use the live setup's `ZAI_API_KEY` variable
  name for the ZAI Coding Plan provider placeholder.
- The primary orchestrator now runs at `variant: high` and explicitly treats
  substantive Rung 1+ work as a structured workflow by default while preserving
  anti-waste, usage gating, and credential/destructive-action safety boundaries.

### Fixed
- `vulcan` command now actually launches: the package declares a `bin` entry
  (`"vulcan": "./bin/vulcan.js"`) and depends on the `opencode-ai` runtime
  (`1.17.9`, matching `@opencode-ai/plugin`), so `npm install -g .` /
  `npm install -g github:slades01/Vulcan-code` creates a working `vulcan` command
  with no machine-specific absolute paths.
- Tracked the Vulcan wordmark **L/A glyph** correction as a patch artifact:
  `patches/opencode/vulcan-wordmark-logo.patch` is a minimal, `git apply`-able
  diff for the opencode runtime's `packages/tui/src/logo.ts` that fixes the bottom
  row of the "Vulcan" pixel wordmark (the `l`/`a` cells), with `patches/README.md`
  documenting how to apply it from an opencode checkout and rebuild the runtime.

### Added
- `bin/vulcan.js` — portable CommonJS launcher (Node, shebang). Resolves the
  installed `opencode-ai` runtime via `require.resolve` and spawns its `opencode`
  bin, forwarding all args with inherited stdio and preserved exit status. Supports
  a `VULCAN_RUNTIME` override and prints a concise reinstall hint on
  resolve/ENOENT failures.

### Changed
- README and quickstart install instructions now use `npm install -g ...` and
  `vulcan --version` (prints the bundled runtime version, e.g. `1.17.9`).

## [1.0.0-vulcan.0] - 2026-06-25

### Changed
- Rebranded the public package as **VulcanCode**, launched via the `vulcan` command. User-facing
  docs, package metadata, scripts, smoke tests, and the release archive now say VulcanCode/`vulcan`
  instead of opencode.
- New release archive `vulcan-1.0.0-fast.zip` (forward-slash entries). The previous
  `opencode-1.0.0-fast.zip` is removed from the current tree but retained in git history.
- `npm run config:health` and the documented smoke tests now run `vulcan --version` /
  `vulcan debug ...`.
- Renamed the `opencode-maintainer` agent to `vulcan-maintainer` and updated its references.
- Branding cleanup of residual opencode-derived names: the laptop workhorse recovery paths
  (legacy opencode-branded workhorse path → `~\vulcan-workhorse\`) and benchmark script
  (`benchmark_opencode_workhorse.py` → `benchmark_vulcan_workhorse.py`) in
  `command/laptop-research.md` and `skills/laptop-research-workhorse/SKILL.md` now use
  Vulcan-branded names (recovery-only / unavailable status and `laptop-gemma/*` provider IDs
  are preserved).
- `examples/quickstart.md` no longer links VulcanCode to `https://opencode.ai`; the opencode
  install docs are referenced only as the underlying runtime.
- `package.json` metadata key `opencode` renamed to a Vulcan-branded `vulcan` object; the
  `@opencode-ai/plugin` dependency is unchanged.
- `README.md` adds a preserved-identifiers note clarifying that `opencode-go/...` provider/model
  IDs are intentional provider identifiers, not stale branding.

### Preserved (intentional technical references)
- Config schema URL `https://opencode.ai/config.json` and the `@opencode-ai/plugin` SDK —
  VulcanCode uses the opencode config schema and plugin SDK under the hood.
- Config file/dir names the runtime loads: `opencode.jsonc`, `config/opencode.example.jsonc`,
  `~/.config/opencode`, `.opencode/`.
- `opencode-go/...` provider/model IDs (panel agents) and `laptop-gemma/*` provider IDs —
  registered provider identifiers, not stale branding.

## [1.0.0-fast] - 2026-06-25

### Added
- Initial public release of the Vulcan-code opencode configuration package.
- 33 agents (`agent/`), 26 commands (`command/`), 8 skills (`skills/`).
- TypeScript plugins `trusted-autonomy.ts` and `swarm-compaction.ts` (`plugins/`).
- Guard tools `loop_guard.ts` and `pace_guard.ts` (`tools/`).
- Benchmark suite (`bench/`) and spec workflow docs (`spec/`).
- `config/opencode.example.jsonc` placeholder config, `examples/` walk-throughs.
- Top-level `README.md`, `SECURITY.md`, `LICENSE` (MIT), `package.json`, `tsconfig.json`.
- Downloadable archive `opencode-1.0.0-fast.zip`.

### Security
- Sanitized of all local absolute paths, private hostnames, LAN host information, and
  per-user paths.
- Excluded the raw key-bearing config, usage/billing ledger, private host access, project
  and memory notes, handoffs, local backups, dependency install output, lockfiles, logs, and
  caches.
- Verified zero secret material via blocked-pattern and broader secret scans.
