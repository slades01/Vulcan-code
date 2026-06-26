# Changelog

All notable changes to this package are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/) (with an `-fast` pre-release suffix tracking the
opencode runtime).

## [Unreleased]

### Added
- Synced the public package metadata and sanitized snapshot archive to the live
  VulcanCode runtime version `0.0.0-dev-202606261805`.
- `skills/ultra-default/SKILL.md` documents VulcanCode's UltraCode-inspired
  workflow-by-default behavior: high-effort orchestration, delegated lanes,
  bounded fan-out, adversarial verification, and T0/T1 safety gates.
- `/ultra` and `/ultra-off` commands make the default mode explicit or provide a
  request-local conservative override without mutating config.

### Changed
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
