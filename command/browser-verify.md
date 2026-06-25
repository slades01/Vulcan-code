---
description: Run scoped browser/UI verification through the browser-verifier agent without enabling Playwright globally by default.
agent: browser-verifier
---

Verify this UI/browser behavior:

$ARGUMENTS

Use the cheapest non-browser checks first if they can prove the behavior. If browser evidence is required, use Playwright MCP only when it is enabled for this restarted session. If it is disabled, stop with the exact enable/restart handoff instead of pretending to verify.
