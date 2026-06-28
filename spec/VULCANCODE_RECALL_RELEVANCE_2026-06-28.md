# VulcanCode Recall Relevance Upgrade — 2026-06-28

## Goal

Improve every VulcanCode model's grounding context by making `recall_bus` rank results by actual query relevance instead of mostly by source class.

## Acceptance criteria

- `scoreText` is tokenized, coverage-aware, and resistant to single common-word matches.
- `normalizedScore` lets a strongly relevant lower-priority source outrank a weak higher-priority source, while preserving a small deterministic source prior for ties.
- Recall redaction and budget trimming invariants remain unchanged.
- `bench:recall`, `typecheck`, and the deterministic package gate pass.

## Non-goals

- No remote MCP calls, provider/model calls, secrets, shims, runtime rebuilds, or permission-policy changes.
- No broad rewrite of Code Memory or codemap generation.
- No deletion or migration of memory files.

## File zone

- `tools/recall_bus_lib.mjs`
- `tools/recall_bus_lib.d.mts`
- `bench/recall-golden.mjs`
- `bench/fixtures/recall/relevance.json`

## Design

Previous ranking used `sourceWeight + min(score, 25) / 1000`, so a one-token codemap hit (`100.001`) always beat a nine-token speed-ledger hit (`60.009`). The new contract makes relevance primary:

1. Tokenize query and text with a small stopword filter.
2. Award exact phrase, distinct-term coverage, density, and multi-hit bonuses.
3. Keep source priority as a fractional tie-breaker only.
4. Keep all output redacted before rendering.

## Verification

```powershell
npm run bench:recall
npm run typecheck
npm run bench:run -- "recall-relevance-upgrade-v2"
```

## Rollback

Revert the files in the file zone. No persisted user data or runtime state migration is involved.
