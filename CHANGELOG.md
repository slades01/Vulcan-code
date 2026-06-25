# Changelog

All notable changes to this package are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/) (with an `-fast` pre-release suffix tracking the
opencode runtime).

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

### Preserved (intentional technical references)
- Config schema URL `https://opencode.ai/config.json` and the `@opencode-ai/plugin` SDK —
  VulcanCode uses the opencode config schema and plugin SDK under the hood.
- Config file/dir names the runtime loads: `opencode.jsonc`, `config/opencode.example.jsonc`,
  `~/.config/opencode`, `.opencode/`.

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
