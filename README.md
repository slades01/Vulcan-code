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

> Built and tested as the `1.0.0-fast` release. `vulcan --version` delegates to
> the bundled opencode runtime and prints the runtime version (currently
> `1.17.9`).

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

- [`vulcan-1.0.0-fast.zip`](./vulcan-1.0.0-fast.zip) — sanitized snapshot of this release.

Or clone:

```bash
git clone https://github.com/slades01/Vulcan-code.git
```

## What's included

| Path | Contents |
|---|---|
| `agent/` | 33 agent definitions — orchestrator, build-lead, implementation/verification/optimization lanes, TDD engineer, debugger, research/synthesis/planning leads, panels, etc. |
| `command/` | 28 slash commands — `/ultra`, `/ultra-off`, `/swarm`, `/loop`, `/panel`, `/mission`, `/max-swarm`, `/autofix`, `/config-check`, `/agent-map`, and more. |
| `skills/` | 9 skills — ultra-default, bounded-agent-loops, parallel-orchestration, wave-orchestration, agent-graph-workflows, speed-acceleration, portfolio-orchestration, subscription-usage-management, laptop-research-workhorse (currently unavailable). |
| `plugins/` | `trusted-autonomy.ts` (deny-by-default autonomy plugin) and `swarm-compaction.ts`. |
| `tools/` | `loop_guard.ts` and `pace_guard.ts` — bounded loop / wall-clock pace contracts. |
| `bench/` | Benchmark tasks, scorecard, and a Rung-2 spec gate. See `bench/README.md`. |
| `spec/` | Spec workflow docs. See `spec/README.md`. |
| `config/opencode.example.jsonc` | A from-scratch, placeholder-only example config (no real keys). |
| `examples/` | Quickstart and permissions walk-throughs. |

## Install / use

Install the `vulcan` command globally, then confirm it launches the bundled
opencode runtime:

```bash
# from the GitHub repo (recommended for friends):
npm install -g github:slades01/Vulcan-code

# or from a local clone:
npm install -g .

vulcan --version      # prints the opencode runtime version (e.g. 1.17.9)
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
4. Smoke-test: `vulcan debug startup && vulcan debug config && vulcan debug agent orchestrator`.

See [`examples/quickstart.md`](./examples/quickstart.md) and
[`examples/permissions.md`](./examples/permissions.md).

## Default operating mode

VulcanCode ships with UltraCode-inspired behavior as the orchestrator default:
substantive Rung 1+ work is treated as a structured workflow with visible planning,
delegated specialist lanes, bounded fan-out, adversarial review, and T0/T1 verification
before final. Rung 0 stays lean and inline; high/max swarms still require genuine
parallelism and usage gating. Use `/ultra` to make the default explicit for one request,
or `/ultra-off` for a request-local conservative/solo override.

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
- Config-health gate: `npm run config:health` (`vulcan --version && vulcan debug startup &&
  vulcan debug config && vulcan debug agent orchestrator`).

## License

[MIT](./LICENSE) © slades01
