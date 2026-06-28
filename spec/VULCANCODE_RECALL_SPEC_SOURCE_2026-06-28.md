# VulcanCode Recall Spec Source Coverage — 2026-06-28

## Goal

Keep `recall_bus`'s advertised `rnd-spec` source aligned with the package's actual spec directory instead of one dated R&D filename.

## Decision

- `tools/recall_bus.ts` enumerates `spec/VULCANCODE_*.md` under the selected setup root and scores every matching spec.
- Missing `spec/` directories still return no spec hits without failing the recall tool.
- The recall golden now builds a real temporary setup root with multiple spec files and asserts that a 2026-06-28 recall spec can surface as an `rnd-spec` hit.

## Non-goals

- No change to ranking weights, redaction semantics, memory scoping, or codemap generation.
- No network/provider calls and no reading credential paths.

## Verification

- `npm run bench:recall`
- `npm run typecheck`
- `npm run bench:run -- recall-spec-source-coverage`
- `npm run config:health`

Restart VulcanCode after syncing runtime-loaded `tools/recall_bus.ts` so live sessions use the dynamic spec source.
