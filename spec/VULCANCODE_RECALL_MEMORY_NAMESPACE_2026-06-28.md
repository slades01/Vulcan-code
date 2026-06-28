# VulcanCode Recall Memory Namespace Upgrade — 2026-06-28

## Goal

Reduce memory-index namespace pollution by letting callers scope `recall_bus` memory hits to whole tag tokens such as `vulcancode`, `opencode`, `speed`, or project tags, while preserving current unscoped behavior by default.

## Acceptance criteria

- `recall_bus` accepts an optional `scope` argument for memory-index tag filtering.
- Scope matching is whole-token and case-insensitive; `code` must not match `vulcancode`, `opencode`, or `fastcode`.
- Unscoped recall remains unchanged for design/prose recall safety.
- Existing redaction, relevance, budget, and no-regression gates pass.

## Non-goals

- No migration or deletion of memory notes.
- No remote MCP/provider calls.
- No broad rewrite of global memory-index taxonomy.

## Verification

```powershell
npm run bench:recall
npm run typecheck
npm run bench:run -- "recall-memory-namespace"
npm run config:health
```

## Rollback

Revert `tools/recall_bus*`, the recall golden/fixture updates, and this spec. Default unscoped behavior is preserved, so rollback has no data migration.
