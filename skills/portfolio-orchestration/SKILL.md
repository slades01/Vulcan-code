---
name: portfolio-orchestration
description: Use when coordinating multiple projects, one-session portfolio work, project registry, cross-repo swarms, standing max-autonomy, or continuous improvement backlogs.
---

# Portfolio Orchestration

Use this skill when one opencode session must coordinate multiple projects or a continuous improvement backlog.

## Registry

Maintain a compact project registry in context or in a run manifest:

- `project_id`
- root path
- current goal
- file-ownership zones
- health signals: tests, build, lint, docs, security, performance, dependencies
- active wave id and next useful wave
- residual risks and blocked facts

## Routing

- Shard by project first, then subsystem.
- Do not let edit lanes cross project roots unless the task is explicitly a cross-project integration.
- Use one writer per project/file zone.
- Use read-only lanes freely across projects when they have independent missions.
- Keep verification per project.

## Continuous Backlog

When the user asks for broad improvement or standing max-autonomy, refill work from:

- failing or missing tests
- stale docs and missing examples
- TODO/FIXME/XXX comments
- dependency and lockfile drift
- security-sensitive surfaces
- performance hotspots
- flaky commands or prior failed verifications
- architecture maps and ownership gaps
- open issue/PR context when available

## Output

Return portfolio state, not a pile of lane reports:

- project table: id, root, current wave, status, next action
- changed files grouped by project
- verification grouped by project
- residual backlog and which wave should run next
