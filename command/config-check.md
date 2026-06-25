---
description: Audit vulcan config, agents, commands, skills, plugins, tools, MCPs, providers, models, and permissions for upgrade opportunities.
agent: orchestrator
---

Run an vulcan setup audit for:

$ARGUMENTS

Protocol:

1. Use the `vulcan-maintainer` lane when available.
2. Inventory global and project vulcan config files, agents, commands, skills, plugins, tools, MCPs, references, memory indexes, spec artifacts, bench assets, and package metadata.
3. Check non-secret provider/model signals with safe CLI commands only.
4. Do not read credential stores, token caches, browser profiles, SSH keys, or cloud secrets.
5. Validate config shape against `https://opencode.ai/config.json` before recommending edits.
6. Run or recommend focused local checks: `vulcan --version`, `vulcan debug startup`, `vulcan debug config`, `vulcan debug agent orchestrator`, `vulcan debug agent <changed-agent>`, `vulcan agent list`, `vulcan mcp list`, `npm run typecheck`, and command/agent content checks for references, prime recall, spec gates, browser-verifier, and evaluator bench wiring. Treat `debug startup` as insufficient by itself; `debug config` plus the relevant `debug agent <name>` is the T1 gate for config-time changes.
7. Report upgrade recommendations by priority and separate safe edits from behavior-changing edits.
8. If edits are requested, apply the smallest safe changes, keep `.bak` rollback copies for runtime-loaded files when not git-backed, verify config/MCP/package health, and remind the user to restart vulcan before relying on changed config-time files.
