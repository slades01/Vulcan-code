# VulcanCode

**VulcanCode** is a clean, **public** agent configuration package — a high-autonomy,
security-first coding-agent setup built around UltraCode-inspired workflow-by-default
orchestration, GLM + GPT model routing, bounded agent loops, parallel execution, and a
deny-by-default permission posture. You launch it with the
`vulcan` command.

This repository contains the shareable subset of a live VulcanCode setup: agents, commands,
skills, plugins, tools, benchmarks, and specs — sanitized of all local paths, hostnames,
private infrastructure, and secrets. Clone it, copy the pieces you want into your own
`~/.config/opencode`, and adapt.

> Built and tested as the `1.0.0-fast` release. The portable GitHub package still
> launches the bundled `opencode-ai` runtime dependency unless you override it
> with `VULCAN_RUNTIME`.
>
> Current VulcanCode package version: `0.0.0-dev-202606261805`, matching the live
> local VulcanCode runtime this snapshot was taken from. `vulcan --version`
> delegates to the bundled opencode runtime and prints the runtime version
> (currently `1.17.9`).

> **Compatibility note:** VulcanCode currently uses the [opencode](https://opencode.ai) config
> schema (`https://opencode.ai/config.json`) and the `@opencode-ai/plugin` SDK under the hood,
> so config files live in the standard opencode locations (`~/.config/opencode`, `.opencode/`)
> and use the `opencode.jsonc` filename. `vulcan` is the branded launch command for the same
> runtime.
>
> **Preserved identifiers:** Provider/model IDs of the form `opencode-go/...` (used by the
> panel agents) are **intentional provider identifiers** for the OpenCode Go model-routing
> provider, not stale branding. They are wired into registered providers and should not be
> renamed.

## Download

Grab the whole package as a single archive from this repo:

- [`vulcan-0.0.0-dev-202606261805.zip`](./vulcan-0.0.0-dev-202606261805.zip) — sanitized snapshot of this version.
- [`vulcan-1.0.0-fast.zip`](./vulcan-1.0.0-fast.zip) — sanitized snapshot of this release.

Or clone:

```bash
git clone https://github.com/slades01/Vulcan-code.git
```

## What's included

| Path                            | Contents                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agent/`                        | 33 agent definitions — orchestrator, build-lead, implementation/verification/optimization lanes, TDD engineer, debugger, research/synthesis/planning leads, panels, etc.                                                                                                                                                                                                    |
| `command/`                      | 28 slash commands — `/ultra`, `/ultra-off`, `/swarm`, `/loop`, `/panel`, `/mission`, `/max-swarm`, `/autofix`, `/config-check`, `/agent-map`, and more.                                                                                                                                                                                                                     |
| `skills/`                       | 9 skills — ultra-default, bounded-agent-loops, parallel-orchestration, wave-orchestration, agent-graph-workflows, speed-acceleration, portfolio-orchestration, subscription-usage-management, laptop-research-workhorse (currently unavailable).                                                                                                                            |
| `plugins/`                      | `trusted-autonomy.ts` (deny-by-default autonomy plugin), `swarm-compaction.ts` (continuation-state preservation), and `metrics-tap.ts` (non-secret `.opencode/run/metrics.jsonl` event tail).                                                                                                                                                                               |
| `tools/`                        | Workflow helpers `agent_graph.ts`, `loop_guard.ts`, `pace_guard.ts`, `mission_state.ts` (one-writer file-zone leases + continuation state), `recall_bus.ts` (+ `recall_bus_lib.mjs`) tiered redacted retrieval, `synthesis.ts` (convergence helper); Code Memory `code_memory.ts` + `codemap_health.ts`; and `codemap/` (the deterministic local code-graph engine + CLIs). |
| `bench/`                        | Benchmark tasks, scorecard, a Rung-2 spec gate, a `recall-golden.mjs` redaction/relevance golden test, and a parallelized deterministic local no-regression gate. See `bench/README.md`.                                                                                                                                                                                    |
| `spec/`                         | Spec workflow docs. See `spec/README.md`.                                                                                                                                                                                                                                                                                                                                   |
| `config/opencode.example.jsonc` | A from-scratch, placeholder-only example config (no real keys).                                                                                                                                                                                                                                                                                                             |
| `examples/`                     | Quickstart and permissions walk-throughs.                                                                                                                                                                                                                                                                                                                                   |

## Code Memory (local code graph)

VulcanCode ships a Cognee-like **local code-memory overlay**: a deterministic
Extract → Cognify → Load (ECL) pipeline that scans a repo for code/docs, extracts
files/symbols/edges into `.opencode/codemap/{nodes.jsonl,edges.jsonl,manifest.json}`,
and lets later tasks do **structural recall** (a cheap graph query) instead of
rebuilding cartography from scratch every time. Benchmarked recall is typically
10×+ faster than a full regenerate on small/medium repos.

- **Engine:** `tools/codemap/lib.mjs` — pure Node ESM, no hard external deps.
  Exports `generateCodemap`, `recallCodemap`, `healthCodemap`, `benchCodemap`.
  Cognify uses **optional real parsers** discovered safely at runtime: the JS/TS family
  is parsed with a trusted engine-local TypeScript compiler API when available
  (functions, classes, methods, accessors, interfaces, type aliases, enums,
  namespaces, variable bindings, side-effect/re-export imports, call expressions,
  real start/end spans), and Python can be parsed with stdlib `ast` only when
  `VULCAN_CODE_MEMORY_PYTHON` points to an absolute trusted Python 3 binary.
  Both degrade to the line-regex extractors if unavailable or on a parse failure, and
  `manifest.parsers` records which path each file used.
- **CLIs:** `tools/codemap/{generate,recall,health,bench}.mjs`
  (`npm run codemap:generate|health|recall|bench`).
- **Plugin tools:** `tools/code_memory.ts` (`code_memory`, op =
  `generate|recall|health|bench`) and `tools/codemap_health.ts` (`codemap_health`).
- **Safety:** credential-like paths are excluded from scanning; file content is
  secret-scanned before any snippet/doc/signature is persisted, and suspected
  secrets are redacted and never written. Data model, safety, and verification
  are documented in `spec/codemap.md`.

```bash
npm run codemap:generate               # build the overlay into .opencode/codemap
npm run codemap:health                 # ok | stale | missing | drift
npm run codemap:recall                 # query="memory" by default; pass --query
```

## Install / use

Install the `vulcan` command globally, then confirm it launches the bundled
opencode runtime:

```bash
# from the GitHub repo (recommended for friends):
npm install -g github:slades01/Vulcan-code

# or from a local clone:
npm install -g .

vulcan --version      # prints the runtime version (e.g. "1.17.9") and delegates to the bundled opencode runtime
```

This installs the `vulcan` command (a small Node launcher, `bin/vulcan.js`) plus
the `opencode-ai` runtime as a dependency, so there are no machine-specific
absolute paths — `vulcan` resolves the runtime wherever npm installed it.

> **Platforms:** Supported OS/CPU are inherited from the `opencode-ai` runtime —
> Windows, macOS, and Linux on x64/arm64. `vulcan` itself only needs Node.js to launch.

> Debugging tip: point `vulcan` at a different runtime build with
> `VULCAN_RUNTIME=/path/to/opencode vulcan ...` (handy for local branded builds).
> On Windows PowerShell:
> `$env:VULCAN_RUNTIME='C:\path\to\opencode.exe'; vulcan ...`.

Then:

1. Copy the pieces you want into your config directory (`~/.config/opencode` on
   macOS/Linux, `%USERPROFILE%\.config\opencode` on Windows). You do not need all
   of it — start with `agent/orchestrator.md` + a few commands/skills.
2. Copy `config/opencode.example.jsonc` → `opencode.jsonc`, fill in your own
   provider keys via environment variables (e.g. `{env:OPENAI_API_KEY}`). **Never**
   commit a real `opencode.jsonc`.
3. (Optional, for plugin/tool type-checking) `npm install && npm run typecheck`.
4. Smoke-test config and live model routes:

   ```bash
   vulcan debug startup
   vulcan debug config
   vulcan debug agent orchestrator
   vulcan debug agent implementation-lane
   vulcan run --agent orchestrator "Smoke test only. Reply exactly: orchestrator callable."
   vulcan run --model opencode-go/glm-5.2 "Smoke test only. Reply exactly: GLM worker callable."
   ```

   `debug startup` is only a shallow runtime check. The two `vulcan run` calls prove prompt
   creation, database schema compatibility, provider authentication, and model availability.

See [`examples/quickstart.md`](./examples/quickstart.md) and
[`examples/permissions.md`](./examples/permissions.md).

## Default operating mode

VulcanCode ships with UltraCode-inspired behavior as the orchestrator default:
substantive Rung 1+ work is treated as a structured workflow with visible planning,
delegated specialist lanes, bounded fan-out, adversarial review, and T0/T1 verification
before final. Rung 0 stays lean and inline; high/max swarms still require genuine
parallelism and usage gating. Use `/ultra` to make the default explicit for one request,
or `/ultra-off` for a request-local conservative/solo override.

## Local source vs live config

Use this repo as the **local Vulcan source** and `~/.config/opencode` as the
**live Vulcan config**:

| Term         | Path                                                     | Meaning                                                                     |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| Local source | this repo, e.g. `/Users/ethancurb/Documents/Vulcan-code` | Editable/versioned development copy. Safe to branch, experiment, and break. |
| Live config  | `~/.config/opencode`                                     | Actual config loaded by `vulcan` from any project. Treat as production.     |

Do **not** symlink live config to the repo unless you intentionally want branch
switches and half-edits to affect every Vulcan session. The recommended workflow is
controlled deploy:

```bash
# Check whether local source and live config match.
scripts/compare-local-live-vulcan.sh

# Preview what a deploy would sync. Timestamp-only rows may appear; the compare
# script is the authoritative content drift check.
scripts/deploy-local-to-live-vulcan.sh --dry-run

# Deploy approved local source assets to live config, then verify live routes.
scripts/deploy-local-to-live-vulcan.sh

# Roll back the latest deploy backup if needed.
scripts/rollback-live-vulcan.sh
```

The deploy script syncs only non-secret Vulcan assets: `agent/`, `command/`,
`skills/`, `plugins/`, and `tools/`. It does not copy credentials, auth stores,
usage ledgers, logs, memory, or `opencode.jsonc` provider secrets. Restart Vulcan
after deploy or rollback because agent/command/skill/plugin files are loaded at
session startup.

## Security posture

This package is **deny-by-default** for credential-like paths and destructive shell shapes.
Agents ship permission frontmatter that denies reads of SSH keys, `.pem`/`.key`/`.p12` files,
`.env*`, `.ssh`, `.aws`, `.azure`, `.kube`, browser profile data, and anything matching
`*token*` / `*secret*` / `*credentials*`. The `trusted-autonomy` plugin hardens `ask` rules
into `deny` for sensitive paths and blocks destructive commands per-segment. See
[`SECURITY.md`](./SECURITY.md) and [`examples/permissions.md`](./examples/permissions.md).

## What is deliberately NOT included

To keep this package clean and safe, the following categories were excluded from the source
setup: the raw key-bearing config, the usage/billing ledger, private laptop/host-access
bundles, project and memory notes, session handoffs, local backup snapshots, the speed
ledger, dependency install output, lockfiles, logs, and caches. No credentials, billing, or
private host information are present.

## Verification (this release)

- Secret/private indicator scan across the payload (SSH key material, local absolute paths,
  private LAN hosts, hostname/host-access tokens, provider key env names, the usage ledger
  path, backup markers, and dependency directories) → **zero non-defensive hits**. The only
  literal residual is `ed25519`, present solely inside defensive `"*id_ed25519*": deny`
  permission rules and one deny-regex — a security feature that contains no key material
  (see `SECURITY.md`).
- Broader secret scan (`sk-…`, `AKIA…`, `ghp_…`, `Bearer …`, provider key assignments) → **0 hits**.
- TypeScript: `tsc --noEmit` over `plugins/**` and `tools/**`.
- Code Memory: `node tools/codemap/{generate,recall,health,bench}.mjs` over this
  repo; overlay is deterministic (reproducible canonical digests) and secret-safe
  (0 secret-flagged on this payload). See `spec/codemap.md`.
- Config-health gate: `npm run config:health` (`vulcan --version && vulcan debug startup &&
  vulcan debug config && vulcan debug agent orchestrator`).

## License

[MIT](./LICENSE) © slades01
