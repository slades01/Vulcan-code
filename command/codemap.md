---
description: Build, recall from, or health-check the VulcanCode Code Memory local code graph overlay.
agent: orchestrator
---

Manage the Code Memory code-graph overlay for:

$ARGUMENTS

Map the arguments to one of these operations (default: `recall` if an overlay exists, else `generate`):

- `generate` (aliases: build, refresh, rebuild, sync, gen) — run `code_memory` op `generate` to (re)build `.opencode/codemap/{nodes.jsonl,edges.jsonl,manifest.json}` for the current project root.
- `recall <query>` (aliases: find, search, lookup, where) — run `code_memory` op `recall` with the query to look up files/symbols/edges from the precomputed graph. Much faster than rebuilding cartography.
- `health` (aliases: status, check, drift) — run `codemap_health` (or `code_memory` op `health`) to report status `ok|stale|missing|drift`, file drift, and secret-flagged count.
- `bench` (aliases: timing, speed) — run `code_memory` op `bench` to print generate-vs-recall timings as JSON.

Protocol:

1. If no operation is inferable and no overlay exists, generate first; otherwise recall.
2. Default root is the current project; default out is `<root>/.opencode/codemap`.
3. Prefer the plugin tools (`code_memory` / `codemap_health`) when registered; otherwise fall back to the CLIs: `npm run codemap:generate|health|recall|bench`.
4. Do not pass secrets, tokens, credentials, or proprietary code as the query. The engine redacts suspected secrets regardless.
5. After `generate`/`recall`, summarize: counts (files/symbols/edges), any secret-flagged files (names only, never contents), and whether the overlay is fresh or drifted.
6. If `health` reports `missing`/`stale`/`drift`, recommend regenerate before trusting recall.
