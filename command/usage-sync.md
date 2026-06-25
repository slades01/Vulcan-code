---
description: Refresh the non-secret subscription usage ledger and recommend max-autonomy model budgets.
agent: subscription-usage-oracle
model: openai/gpt-5.5-fast
variant: low
---

Refresh subscription usage state for:

$ARGUMENTS

Use `subscription-usage-management` and the ledger at:

`~\.config\opencode\usage\subscriptions.jsonc`

Protocol:

1. Do not ask for permission and do not read secrets, cookies, browser profiles, API keys, billing portals, or credential files.
2. Read the non-secret ledger and local `opencode stats`.
3. If the user supplied non-secret remaining quota numbers in `$ARGUMENTS`, update the ledger.
4. If exact remaining quota is unavailable, mark the affected pool unknown or stale; do not infer green from local cost or token proxy.
5. Return per-subscription state, combined state, routing policy, max-swarm execution recommendation, and exact ledger fields that need non-secret updates.
