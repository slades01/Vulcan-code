# VulcanCode Recall Budget Fairness Upgrade — 2026-06-28

## Goal

Prevent a single long recall hit from starving later, compact high-value hits in the rendered `recall_bus` output.

## Acceptance criteria

- `renderRecall` redacts an item before any excerpting or budget trimming.
- Oversized hits are excerpted with an explicit `excerpted by recall_bus` note.
- Redaction markers present outside the excerpt window are preserved as marker notes.
- If one ranked hit does not fit, rendering continues to later hits instead of breaking.
- Recall goldens and package no-regression gates pass.

## Non-goals

- No changes to ranking semantics beyond render-time budget fairness.
- No provider/model calls or external network use.
- No changes to memory storage or codemap generation.

## Verification

```powershell
npm run bench:recall
npm run typecheck
npm run bench:run -- "recall-budget-fairness"
npm run config:health
```

## Rollback

Revert the renderRecall changes and recall golden additions. Ranking and scoped memory filtering remain independent.
