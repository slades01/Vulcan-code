---
description: Estimate subscription usage state for ChatGPT Pro, GLM Code, and OpenCode Go; recommend normal, high, or max swarm budgets without reading credentials.
agent: usage-accountant
model: opencode-go/glm-5.2
---

Check usage and swarm budget for:

$ARGUMENTS

Use the non-secret subscription ledger at `~\.config\opencode\usage\subscriptions.jsonc` and local opencode activity stats if helpful, but treat local stats as a proxy only. Do not access credentials, browser profiles, billing portals, API keys, token caches, SSH keys, or cloud secrets.

Return:

1. Per-pool state for ChatGPT Pro, GLM Code/Z.AI Coding Plan, and OpenCode Go.
2. Combined usage state: green, yellow, red, or unknown.
2. What evidence was used.
3. Recommended swarm mode: normal, high, max, or ask first.
4. Recommended fan-out/depth/node caps.
5. Recommended model mix.
6. Exact non-secret ledger fields needed, such as reset day and remaining quota.
