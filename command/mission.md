---
description: "Run an autonomous bounded mission: plan, execute, verify, review, and iterate until done or safely stopped."
agent: orchestrator
---

Run autonomous mission mode for:

$ARGUMENTS

Mission-mode contract:

1. Act as the user's delegated operator. Do not ask for approval to use tools, edit files, run safe commands, launch subagents, use MCPs, or iterate.
1a. Use the `speed-acceleration` skill for wall-clock pacing and self-improvement.
1b. Prime context before the first action: read relevant `AGENTS.md`/instructions, configured references, project/global memory indexes, compact handoff docs, and speed-ledger lessons when in scope. Keep recall to the smallest non-secret set that can change the plan.
2. Apply the team-lead escalation ladder from `orchestrator.md`: Rung 0 inline only for trivial/config/read-only work; Rung 1 delegate to one implementation/TDD/optimization lane plus verification; Rung 2 run graph-planner -> R&D -> spec artifact -> build -> verify leads for unfamiliar or risky work; Rung 3 use parallel swarm only on its triggers. The orchestrator plans, dispatches, and verifies; specialist lanes author non-trivial diffs.
3. Before the first action, define internally or visibly when useful:
   - Mission goal.
   - Acceptance criteria.
   - Verification target/commands.
   - Wall-clock phase budget and starting verification tier.
   - Max iterations, default 5 repair iterations per concrete verification failure.
   - Stop conditions.
   - File ownership zones.
   For long-horizon missions, create or update `.opencode/run/MISSION.md` when safe and in-scope. Treat it as the compact canonical continuation artifact across compaction/restart; do not store raw lane output or sensitive data there.
4. Use `loop_guard` when available for any repeated repair/verification loop.
5. Continue until one of these is true:
   - Acceptance criteria are met and verification passes.
   - The max iteration limit is reached.
   - The same failure repeats twice without new evidence.
   - A required next step would be destructive, credentialed, billing/deploy/publish/account-changing, or outside the mission.
   - A required factual requirement is missing and guessing would create material risk.
   - A tool/action is denied by safety policy.
   - Phase budget is exhausted before T0/T1 verification is green.
6. Failure classification after each failed verification:
   - Current-change regression: fix within the loop.
   - Pre-existing failure: document evidence; do not expand scope unless required by the mission.
   - Environment failure: report missing dependency/service/platform issue.
   - Unknown: gather one safe diagnostic, then change strategy if still unknown.
7. Keep a visible todo list for multi-step missions. Keep exactly one active item.
8. Use `pace_guard` when available for non-trivial work. Batch independent read-only tool calls and lanes; abandon unresolved speculative read-only lanes at barriers instead of blocking progress.
9. Prefer focused verification first, then broaden only when focused checks pass or risk requires it.
10. Run a 60-second speed retro for Rung 2+ or slow missions and preserve reusable non-secret lessons in the speed ledger.
11. Final response: mission result, files changed, verification tier reached, phase-budget choices, fan-out actually used, speed lesson if any, failures encountered/classified, remaining risk, and the next best mission if any.

Hard safety boundaries: never read secrets/credentials, never perform destructive git/filesystem history operations, never publish/deploy/spend/change billing, never force-push, and never make irreversible external account changes unless explicitly requested and allowed by policy.
