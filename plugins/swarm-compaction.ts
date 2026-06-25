import type { Plugin } from "@opencode-ai/plugin"

const swarmCompaction: Plugin = async () => {
  return {
    "experimental.session.compacting": async (_input, output) => {
      output.context.push(`## Swarm Continuation State
Preserve any active agent graph or loop contract. Include:
- Current goal, acceptance criteria, and verification target.
- Node map: node id, agent, mission, status, dependencies, and outputs.
- Wave manifest when active: run id, wave id, cumulative node count, mission hashes, file-ownership zones, reducers, and next wave decision.
- Subscription usage state when relevant: ChatGPT Pro/OpenAI, GLM Code/Z.AI Coding Plan, OpenCode Go, ledger path, freshness, combined state, and routing caps. Preserve only non-secret quota numbers and confidence labels.
- If a run-scoped scratch manifest exists, preserve its path and checksum/status instead of copying large raw lane outputs.
- Files modified or intentionally left untouched.
- Commands already run, exit status, and only non-sensitive output excerpts.
- Open risks, blockers, user decisions needed, and next safest action.
- Stop conditions for any ongoing autonomous loop.

Redaction rule: never preserve secrets, tokens, API keys, cookies, passwords,
private keys, credential file contents, or proprietary snippets that were not
needed for the user's visible task. Replace any accidental sensitive value with
[REDACTED] and preserve only the reason it mattered.`)
    },
  }
}

export default swarmCompaction
