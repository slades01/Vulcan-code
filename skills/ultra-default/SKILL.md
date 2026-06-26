---
name: ultra-default
description: Always-on UltraCode-inspired default operating mode for VulcanCode; use for substantive coding, research, orchestration, workflow, swarm, verification, or autonomous tasks.
---

# Ultra Default Mode

This skill makes VulcanCode operate by default like Claude Code's UltraCode where it is useful: high-effort orchestration, dynamic workflow planning, delegated worker lanes, adversarial verification, and bounded resource controls. It is always-on doctrine for the primary orchestrator; do not wait for a user to say `mission`, `workflow`, `swarm`, or `ultra` before applying it to substantive work.

## Research-grounded model

Public Claude Code evidence shows UltraCode is best understood as **high/xhigh reasoning + dynamic workflows**:

- It is gated to models that support `xhigh` effort.
- The `ultracode` trigger enables dynamic workflows, not a secret model.
- Dynamic workflows fan out work across many background agents for larger tasks.
- The win is plan-in-workflow execution: the orchestrator keeps the board and final synthesis while subagents hold intermediate work.
- Quality comes from independent cross-checking, claim filtering, and bounded loops, not from fan-out alone.

VulcanCode should port the operating principles, not Claude-specific settings names.

## Default gate

Classify every user request before acting:

1. **Rung 0 / trivial:** one-line typo, literal, import/path, comment/docstring/config value, pure read-only answer, or VulcanCode setup micro-edit. Do it inline. No fan-out. Keep output concise.
2. **Rung 1 / clear small change:** treat as a workflow, but not a swarm. Show a compact plan, dispatch one specialist implementation/TDD/optimization lane, then fork-join verification and review when the diff is non-trivial.
3. **Rung 2 / unfamiliar, risky, ambiguous, cross-cutting, security, data-loss, or architecture:** build a visible node map first, run R&D before build, create a compact spec/acceptance artifact, then dispatch one edit lane per file zone and independent verification/review.
4. **Rung 3 / genuinely parallel or repo-wide:** use fast/tdd/review/max swarm behavior only when independent subtasks and file-zone separation justify it, or when the user explicitly asks for high/max fan-out.

Default-to-workflow means default-to-structured-plan-and-delegation. It does **not** mean every task becomes a broad swarm.

## Operating rules

- **Plan visibly:** for Rung 1, give a short plan; for Rung 2+, give a node map with node id, mission, dependencies, and verification signal.
- **Delegate by default:** the orchestrator plans, dispatches, synthesizes, and verifies. It authors implementation diffs only for Rung 0 and VulcanCode setup/config/agent/command/plugin/skill edits.
- **One writer per zone:** never run two editing lanes over the same file zone. Read-only research/review lanes may run in parallel.
- **Verify adversarially:** every non-trivial diff gets T0 + T1 minimum verification and independent review. Claims from research fan-out should be cross-checked; filter unsupported claims before synthesis.
- **Use guards:** use `pace_guard` for non-trivial missions and `loop_guard` before repair/autofix loops. Cap repair at 5 iterations and change strategy after repeated same-cause failure.
- **Reasoning tier:** use the highest supported effort for Rung 2+, security/data-loss, hard ambiguity, final synthesis, and VulcanCode setup changes. Keep Rung 0 lean.
- **Cost gating:** read the non-secret usage ledger before high/max swarms. Unknown is not green: execute capped useful waves, avoid uncapped 1000-node runs, and prefer focused GLM worker lanes.
- **Safety floor:** never weaken trusted-autonomy, credential/secret denies, destructive-action denies, or T0/T1 verification to make the mode feel faster.

## Ultra-off escape hatch

If the user invokes `/ultra-off` or explicitly asks for conservative/solo mode, keep the safety floor but temporarily restore pre-ultra behavior for that request:

- Rung 0 inline.
- Rung 1 one lane only, with the shortest useful plan.
- Rung 2 only when risk/ambiguity truly requires it.
- No high/max swarm unless explicitly requested.
- Keep T0/T1 for non-trivial diffs.

This is a behavioral request override, not a persistent session flag or config mutation; it narrows workflow/fan-out posture and does not rewrite the agent's configured model effort. To stay conservative across multiple turns, the user must keep invoking `/ultra-off` or explicitly restate conservative/solo mode.

## Done condition

For non-trivial work, the final answer should state: what changed, which lanes/fan-out actually ran, verification evidence, and any remaining risk. If verification cannot reach T1, stop with a precise handoff instead of shipping.
