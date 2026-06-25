---
description: Capture durable project memory, decisions, commands, and workflow notes safely.
agent: orchestrator
---

Capture durable memory from this session or topic:

$ARGUMENTS

Use memory-curator. Preserve only reusable, non-secret knowledge:

- Architecture decisions and reasons.
- Project-specific conventions.
- Verification commands.
- Known pitfalls and recovery steps.
- Agent workflow notes that will help future sessions.

Do not ask for approval before writing memory. Prefer updating an existing `AGENTS.md`, `.opencode/`, `docs/`, or runbook file if present; otherwise create the smallest clearly named long-lived file and report it.

Also update the nearest memory index when the memory should be recalled later:

- Project: `.opencode/memory-index.md`.
- Global opencode setup: `~\.config\opencode\memory-index.md`.

Index format: `YYYY-MM-DD | topic | file | why it matters | tags`. Keep entries non-secret and compact.
