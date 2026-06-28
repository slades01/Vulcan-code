import type { Plugin } from "@opencode-ai/plugin"
import fs from "fs/promises"
import path from "path"

const swarmCompaction: Plugin = async () => {
  return {
    "experimental.session.compacting": async (_input, output) => {
      let missionState = "No .opencode/run/state.json snapshot found."
      try {
        const file = path.join(process.cwd(), ".opencode", "run", "state.json")
        const parsed = JSON.parse(await fs.readFile(file, "utf8"))
        missionState = `Mission State Store: ${file}\nContinuation hash: ${parsed?.compaction?.continuation_hash || "<missing>"}\nGoal: ${parsed?.goal || "-"}\nVerification: ${parsed?.verification_target || "-"}\nNext: ${parsed?.next_safe_action || "-"}`
      } catch {}
      output.context.push(`## Swarm Continuation State
${missionState}

Preserve any active agent graph or loop contract. If
.opencode/run/state.json exists, treat it as the canonical continuation
artifact: preserve its path and continuation hash and resume from it instead of
re-deriving mission state from transcript memory. Also preserve pointers to
.opencode/run/MISSION.md and .opencode/run/verify.jsonl when present. Preserve
.opencode/run/scratch.md only when it is explicitly redacted/non-secret; keep
only its path/checksum/status, never its content. Include:
- Current goal, acceptance criteria, and verification target.
- Node map: node id, agent, mission, status, dependencies, and outputs.
- Wave manifest when active: run id, wave id, cumulative node count, mission hashes, file-ownership zones, reducers, and next wave decision.
- Subscription usage state when relevant: ChatGPT Pro/OpenAI, GLM Code/Z.AI Coding Plan, OpenCode Go, ledger path, freshness, combined state, and routing caps. Preserve only non-secret quota numbers and confidence labels.
- If a redacted run-scoped scratch manifest exists, preserve only its path and checksum/status instead of copying large raw lane outputs.
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
