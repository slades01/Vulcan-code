---
description: Run a compact model-diverse brainstorming panel for user requests or orchestrator-internal guidance, then synthesize one recommendation.
agent: orchestrator
---

Run a compact high-intelligence, model-diverse brainstorming panel for:

$ARGUMENTS

Purpose: get model/role diversity for ambiguous design, architecture, strategy, debugging, or tradeoff questions without paying full swarm overhead. The orchestrator may use this as an internal guidance tool during autonomous work when a better plan is needed.

Protocol:

1. Panel seats stay read-only. After synthesis, the orchestrator may continue implementation only if the broader user mission already authorizes it.
2. Use 3 seats by default; use 5 only when the problem has genuinely different dimensions.
3. TEMPORARY QUOTA GUARD: OpenCode Go panel seats are disabled because the weekly OpenCode Go usage limit is exhausted. Do not call these disabled seats until re-enabled:
   - `panel-deepseek-v4-pro` (`opencode-go/deepseek-v4-pro`): disabled.
   - `panel-minimax-m3` (`opencode-go/minimax-m3`): disabled.
   - `panel-qwen3-7-max` (`opencode-go/qwen3.7-max`): disabled.
   - `panel-kimi-k2-7-code` (`opencode-go/kimi-k2.7-code`): disabled.
4. While OpenCode Go is disabled, use reliable GLM/GPT seats only. Do not use unreliable free-tier models as panel seats.
5. Seat selection defaults while OpenCode Go is disabled:
   - Fast panel: GLM technical seat + GPT/orchestrator synthesis.
   - Standard panel: GLM technical seat + GPT/orchestrator synthesis; add a reliable paid/subscription dissent seat only when available.
   - Deep panel: GLM technical/repo seat + GLM verifier/reviewer seat + GPT/orchestrator synthesis; add reliable paid/subscription dissent seats only when available.
6. Keep each seat independent: give each a narrow mission and ask for assumptions, recommendation, risks, and one falsifying test.
7. Synthesize; do not concatenate. Return consensus, disagreements, decision criteria, recommended path, and what would change the recommendation.
8. Do not launch more than 5 subagents for a single-repo panel. For small or obvious questions, answer inline instead.

Speed budget:

- Fast panel: 2 seats + orchestrator synthesis.
- Standard panel: 3 seats + synthesis.
- Deep panel: 5 seats + synthesis, only when the extra perspectives are likely to change the decision.

Final response must include: seats actually used, model-family mix where known, recommendation, dissenting views, and next concrete step.
