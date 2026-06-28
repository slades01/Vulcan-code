# VulcanCode Package Parity + Fast Bench Gate (2026-06-28)

- Goal: Close package/live helper-tool parity and accelerate the deterministic
  benchmark gate without weakening any gate or shipping secrets/private paths.
- Non-goals: No model/provider quality benchmark; no change to the `vulcan`
  command, agents, commands, or skills; no package version bump (docs did not
  require one); no live-identity coupling by default.
- Acceptance criteria:
  - Missing non-secret helpers ported into the package: `tools/mission_state.ts`,
    `tools/recall_bus.ts` (+ `recall_bus_lib.mjs` / `.d.mts`), `tools/synthesis.ts`,
    `plugins/metrics-tap.ts`, `bench/recall-golden.mjs`,
    `bench/fixtures/recall/{redaction,relevance}.json`, and tasks
    `long-horizon-continuation.md`, `lease-conflict.md`, `swarm-converge.md`.
  - Differing files synced from live: `tools/agent_graph.ts`, `tools/loop_guard.ts`,
    `tools/pace_guard.ts`, `plugins/swarm-compaction.ts`.
  - `tools/recall_bus.ts` default setup root is portable
    (`os.homedir()/.config/opencode`); no hardcoded per-user absolute path.
  - New portable task `bench/tasks/helper-tools-present.md`.
  - `bench/run.mjs`: independent read-only checks parallelized; deterministic
    labels/order preserved; per-check timing in the signal (`label=status@Nms`);
    `recall:golden` and `helper-tools` added; live-identity/shim checks opt-in via
    `VULCAN_BENCH_LIVE_IDENTITY=1`; missing `state.json` continuation passes/skips
    (fails only on corrupt/missing hash); negative control still forces failure.
  - `package.json` adds `bench:recall`; `config/opencode.example.jsonc` lists the
    helper tool permissions/plugin block without secrets.
  - No real secrets or private absolute paths introduced (defensive deny examples
    excepted); no backup files.
- Edge cases/invariants:
  - `recall_bus` redaction must be idempotent and clean-text lossless; budget trim
    must not leak the query or a 5KB private key.
  - Cross-source ranking must keep a structural codemap hit above a wordy memory
    hit.
  - Gate must remain deterministic in pass/fail even though per-check `@Nms`
    timing is wall-clock.
- File ownership zones (this wave): `tools/**`, `plugins/**`, `bench/**`,
  `config/**`, `package.json`, `README.md`, `CHANGELOG.md`, `spec/**`.
- Verification target / tier: T1 — `npm run typecheck`; `node --check` on ported
  `.mjs`; `npm run bench:recall`; `npm run bench:run -- "package-parity-fast-bench"`;
  negative control (`VULCAN_BENCH_NO_SCORECARD=1 VULCAN_BENCH_NEGATIVE_CONTROL=1`);
  `npm run config:health`; `npm run codemap:bench`.
- Stop conditions: T1 green; or, if a check cannot run due to environment (e.g.
  `vulcan` not on PATH), report `pending` with a precise handoff rather than
  weakening the gate.
- Restart requirement: The ported/synced `tools/**` and `plugins/**` files are
  runtime-loaded by opencode. After applying this wave to a live setup, restart
  the VulcanCode runtime so the new plugin tools and metrics tap take effect.
  (The package files themselves are static; no restart is needed to re-run the
  deterministic bench gate.)
- R&D inputs used: live setup helper files under
  `~/.config/opencode/{tools,plugins,bench}` (non-secret public/runtime helpers
  only); package copies for diff/sync; codemap-smoke kept at the already-sanitized
  package version (the live comment would have introduced a private absolute path).
