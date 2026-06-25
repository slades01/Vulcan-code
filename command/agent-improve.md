---
description: Run a bounded self-improvement workflow for opencode agents, commands, skills, tools, or permissions with benchmarks and safety review.
agent: agent-evaluator
model: openai/gpt-5.5-fast
variant: low
---

Run a bounded agent self-improvement workflow for:

$ARGUMENTS

Protocol:

1. Produce a read-only benchmark plan using `~\.config\opencode\bench\tasks\` when relevant and prepare the scorecard row for `bench\scorecard.md`.
2. Inspect config/schema/permission implications without delegating to edit-capable agents.
3. Define measurable acceptance criteria before edits.
4. Propose minimal diffs. Do not lower safety permissions or broaden shell/edit access unless the user explicitly requests it.
5. Analyze-only is mandatory for this command. Do not apply edits from `/agent-improve`; stop at an exact proposed diff and verification plan.
6. Permission, tool, MCP, provider, plugin, and shell changes require a separate follow-up request naming the exact files or diff to apply.
7. Include the verification commands that must pass after any later apply step: `opencode --version`, `opencode agent list`, focused `opencode debug agent <name>` checks, and the relevant benchmark task/scorecard update.
8. Require security review for permission-affecting changes.
9. Final response: benchmark result, proposed changes, verification plan, restart requirement, and remaining risk.

Stop on invalid schema, denied tool, missing verification, repeated same failure, or any need for credentials/destructive actions.
