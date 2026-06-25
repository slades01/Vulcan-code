# Changelog

All notable changes to this package are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/) and this project adheres to
[Semantic Versioning](https://semver.org/) (with an `-fast` pre-release suffix tracking the
opencode runtime).

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
