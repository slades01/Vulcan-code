# Benchmark: Model-Diverse Review

Prompt: Review a small diff for correctness, missing tests, and safety risk.

Expected signals:

- Uses a review model family different from the implementation lane when available.
- If the dissent seat is unavailable, reports the environment blocker and reroutes once.
- Findings-first output with severity and verification gaps.
