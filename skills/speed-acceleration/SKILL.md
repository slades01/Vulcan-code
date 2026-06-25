---
name: speed-acceleration
description: Use for EVERY non-trivial coding, orchestration, swarm, mission, loop, R&D, verification, or opencode setup task to minimize wall-clock time and continuously improve development speed.
---

# Speed Acceleration

This skill makes wall-clock time a first-class orchestration objective. Use it on every non-trivial task, not only when the user says "speed". The goal is faster delivery with the same safety floor.

## Core Doctrine

- Optimize elapsed time, not just token cost or local convenience.
- Batch independent work aggressively: tool calls, read-only lanes, MCP lookups, verification/review, and research fetches.
- Keep one editing lane per file zone; parallelize everything read-only that can safely run together.
- Use `pace_guard` for Rung 1+ work when available. Use `loop_guard` for repair iterations. They govern different axes.
- Time pressure may drop broad/deep verification, never the T0/T1 safety floor for non-trivial edits.
- Prefer one fast measured path over many speculative paths. Speculation is allowed only when read-only, capped, and discardable.

## Always-On Wall-Clock Awareness

Before work starts, define a lightweight pace contract:

- Fastest plausible route: Rung 0/1/2/3.
- Expected slowest phase.
- Batch plan: which tool calls or lanes launch together.
- Verification tier target: T0/T1 minimum, T2/T3 only when risk or budget requires it.
- Stop/abandon condition for slow lanes.

During work, watch for these time smells:

- Serial discovery: repeated glob/grep/read calls across turns that could have been batched.
- Serial review after verification when both are read-only and could fork-join.
- Waiting on speculative research after the primary path is ready.
- Re-running broad tests before a targeted T0/T1 check.
- Spawning `usage-accountant` when the ledger is fully unknown and policy is deterministic.
- Running a panel when one fast falsifying lane would answer the uncertainty.
- More synthesis turns than implementation/verification turns.

## Verification Ladder

- T0: fastest targeted static/smoke/diff check, usually seconds.
- T1: smallest meaningful test/repro/build slice proving the change path.
- T2: broader suite/build/e2e slice after T1 passes and time remains.
- T3: full suite, fuzz, deep benchmark, multi-model review; use only when risk or explicit mission justifies it.

For non-trivial edits, T0+T1 is mandatory before final unless an environment blocker is documented.

For opencode setup speed upgrades, `opencode debug startup` is only a shallow smoke. After any config, shim, agent frontmatter, command, skill, plugin, tool, or model-routing change, T1 must include `opencode debug config` and `opencode debug agent <changed-agent-or-orchestrator>`; use `npm run config:health` for the baseline orchestrator gate and `npm run config:agent -- <changed-agent>` for every edited non-orchestrator agent when available. Verify one file zone at a time and keep a `.bak` rollback for edited runtime-loaded files when the directory is not git-backed.

## Speculative Acceleration

Use at most two speculative read-only lanes for Rung 2+ tasks:

- Mark them speculative in the node map.
- Give each a narrow falsifiable question.
- Do not let speculative lanes edit files.
- At a barrier, if the primary path is ready and the speculative lane has no concrete safety finding, discard the unresolved output and record the assumption/risk.

## Self-Improvement Loop

The orchestrator may continuously improve speed, not merely write a postmortem. Treat acceleration as an open-ended operating loop that can run during a mission, at verification barriers, and after any Rung 2+ mission, failed loop, slow swarm, opencode setup change, or repeated time smell.

Default loop:

1. Detect the current bottleneck or missed acceleration opportunity.
2. Classify it: serial-tooling, over-research, over-synthesis, slow verification, provider/model latency, environment, fan-out overhead, weak prompt/agent routing, missing helper tooling, noisy output, stale memory, or unknown.
3. Form one or more acceleration hypotheses, each with an observable speed/quality signal.
4. Act autonomously on the safest useful hypothesis when it is in scope and has a concrete reversibility signal: tracked diff, backup, generated-from-source file, one-command rollback, or a small text patch that can be reverted manually. Do not wait for user approval for low-risk speed improvements to opencode skills, commands, agents, prompts, runbooks, ledgers, verification routing, or helper scripts.
5. Verify the improvement with the lightest meaningful signal: reduced tool calls, no truncation, faster T0/T1 path, fewer repair iterations, better lane parallelism, successful startup/skill parse, or a before/after benchmark when practical. For routing, model-selection, fan-out, or verification-ladder changes, include a quality-preserving signal such as T0/T1 still green, an equivalent focused check, or a benchmark that measures both speed and correctness.
6. Promote, watch, backlog, or reject the change. If speed is still materially blocked and another safe hypothesis exists, continue with the next hypothesis within the mission pace budget, capped at 3 in-mission acceleration iterations unless an explicit loop/pace contract sets a tighter or broader bound.

Autonomous acceleration actions allowed when relevant:

- Rewrite or extend this skill, related orchestration skills, non-secret command prompts, agent prompts, and local runbooks to remove recurring bottlenecks, while respecting each target file's ownership rules and using one writer per file zone.
- Create or refine small non-secret helper scripts/tools for summarization, redaction, targeted verification, benchmark collection, or output shrinking, with a rollback path before the change is made persistent.
- Add targeted checks that replace broad slow checks, provided T0/T1 safety is not weakened.
- Change future routing guidance: batch shapes, lane topology, model selection, speculative-lane rules, verification ladder choices, and abandonment thresholds.
- Record durable non-secret lessons or benchmark results in the speed ledger, and maintain a backlog of pending acceleration experiments.

Hard limits:

- Never weaken credential safety, destructive-action boundaries, file-zone ownership, or the mandatory T0/T1 floor for non-trivial edits.
- Never hide or relabel failures to appear faster.
- Never increase fan-out, model cost, network exposure, or persistent background work without a plausible wall-clock benefit and bounded stop condition.
- Never store secrets, proprietary snippets, raw credentials, or full noisy logs in speed memory.

Do not write a ledger entry for every tiny task. Write when a lesson changes future behavior, a benchmark should be repeated, or an acceleration hypothesis remains open.

## Persistent Speed Memory

Use this non-secret ledger for durable speed learning:

`~\.config\opencode\speed\acceleration-ledger.md`

Entry format:

```markdown
## YYYY-MM-DD - Short finding

- Context:
- Slowest phase / time smell:
- Classification:
- Acceleration hypothesis:
- Change made or proposed:
- Verification / benchmark signal:
- Result: promoted | watch | rejected | pending
```

Never store secrets, credentials, proprietary snippets, or full logs in the ledger.

## Promotion Rule

Promote a speed improvement into orchestrator/command/skill doctrine only when:

- It reduced wall-clock time or removed a serial bottleneck in at least one observed task, or it clearly prevents a deterministic stall.
- It does not weaken T0/T1 verification, credential safety, file-zone ownership, or destructive-action boundaries.
- It does not increase fan-out without a matching time benefit.

Reject or rollback a speed rule when it increases wall-clock time, causes duplicate work, hides failures, or increases safety risk.

## Final Reporting

For non-trivial tasks, include one compact speed line in the final response:

- `Speed:` key batching/fork-join/short-circuit choices used, and any remaining slow phase.

Keep it short; do not bloat final answers with timing theory.
