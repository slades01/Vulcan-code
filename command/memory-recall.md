---
description: Recall compact non-secret project or VulcanCode setup memory before planning or implementation.
agent: orchestrator
---

Recall durable memory for:

$ARGUMENTS

Protocol:

1. Search the nearest project `.opencode/memory-index.md` if present and the global `~\.config\opencode\memory-index.md`.
2. Read only the 1-3 referenced non-secret notes most likely to change the plan.
3. Also check relevant `AGENTS.md`, compact handoff docs, and speed-ledger entries when they match the topic.
4. If the **Code Memory** overlay is available, run `codemap_health` first (cheap). When status is `missing` or `stale`, note it and consider `code_memory` op `generate` if code structure/file impact is relevant. When status is `ok`/`drift`-with-overlay-present, run `code_memory` op `recall` with the topic as the query to pull matching files/symbols/edges (definitions, imports, calls, docs) from the precomputed graph — this avoids rebuilding cartography from scratch.
5. Do not read secrets, credentials, billing data, token files, private keys, or browser profiles. The codemap engine redacts suspected secrets regardless; never echo secret-flagged file contents.
6. Return a short recall brief: useful prior decisions, matching code structure (files/symbols/edges) when relevant, verification commands, pitfalls, codemap status (ok/stale/missing/drift), and whether no relevant memory exists.
