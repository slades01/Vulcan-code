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
3. Use reliable paid/subscription seats only. Do not use unreliable free-tier models as panel seats.
4. Seat selection defaults:
   - Fast panel: GLM technical seat + GPT/orchestrator synthesis.
   - Standard panel: GLM technical seat + one model-diverse OpenCode Go dissent seat + GPT/orchestrator synthesis.
   - Deep panel: GLM technical/repo seat + GLM verifier/reviewer seat + up to two model-diverse OpenCode Go seats + GPT/orchestrator synthesis.
5. Keep each seat independent: give each a narrow mission and ask for assumptions, recommendation, risks, and one falsifying test.
6. Synthesize; do not concatenate. Return consensus, disagreements, decision criteria, recommended path, and what would change the recommendation.
7. Do not launch more than 5 subagents for a single-repo panel. For small or obvious questions, answer inline instead.

Speed budget:

- Fast panel: 2 seats + orchestrator synthesis.
- Standard panel: 3 seats + synthesis.
- Deep panel: 5 seats + synthesis, only when the extra perspectives are likely to change the decision.

Final response must include: seats actually used, model-family mix where known, recommendation, dissenting views, and next concrete step.
