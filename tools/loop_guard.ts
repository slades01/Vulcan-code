import { type Plugin, tool } from "@opencode-ai/plugin"
import fs from "fs/promises"
import path from "path"

async function metricsVerdict(root: string) {
  try {
    const file = path.join(root, ".opencode", "run", "metrics.jsonl")
    const lines = (await fs.readFile(file, "utf8")).trim().split(/\r?\n/).filter(Boolean).slice(-5)
    const hashes = lines.map((line) => {
      try { return JSON.parse(line).args_hash as string | undefined } catch { return undefined }
    }).filter(Boolean)
    const last = hashes.at(-1)
    const repeat = last ? hashes.filter((h) => h === last).length : 0
    if (repeat >= 2) return `\n\nStructured verdict: **escalate** — latest metrics args_hash repeated ${repeat} time(s). Change strategy before retrying the same action.`
    return `\n\nStructured verdict: **continue** — metrics tail available (${lines.length} line(s)); no repeated args_hash escalation.`
  } catch {
    return "\n\nStructured verdict: **continue** — no metrics tail available; use contract manually."
  }
}

const loopGuardTool = tool({
  description: "Create a bounded autonomous loop contract with stop conditions, verification signal, failure classification, escalation rules, and an optional metrics-tail verdict.",
  args: {
    goal: tool.schema.string().describe("The outcome the loop is trying to reach."),
    verification: tool.schema.string().optional().describe("The command, test, check, or observable signal that proves success."),
    maxIterations: tool.schema.number().optional().describe("Maximum loop iterations. Defaults to 5."),
    root: tool.schema.string().optional().describe("Project root for optional .opencode/run/metrics.jsonl tail verdict."),
  },
  async execute(args) {
    const goal = String(args.goal || "").trim()
    const verification = String(args.verification || "").trim()
    const maxIterations = Math.max(1, Math.min(10, Math.floor(Number(args.maxIterations || 5))))

    if (!goal) return "Blocked: define the loop goal before starting an autonomous repair loop."
    if (!verification) {
      return `# Loop Contract Blocked\n\nGoal: ${goal}\n\nMissing verification target. Define the command, test, check, or observable signal that proves success before editing or retrying.\n\nSafe next step: ask one clarifying question or infer the smallest focused verification check from the user's exact request. Do not start the loop until that signal is explicit.`
    }

    const verdict = await metricsVerdict(String(args.root || process.cwd()))
    return `# Loop Contract\n\nGoal: ${goal}\n\nVerification target: ${verification}\n\nMax iterations: ${maxIterations}\n\nState machine:\n\n1. Observe: inspect current state, errors, tests, and diffs.\n2. Decide: choose one concrete action tied to the verification target.\n3. Act: make the smallest safe change or run the next diagnostic.\n4. Verify: run the target check or the closest focused check.\n5. Review: classify result and decide whether another iteration is justified.\n6. Record: update todos and preserve important findings.\n\nStop immediately when:\n\n- Verification passes.\n- Acceptance criteria are met.\n- The next action is destructive, credentialed, or materially broader than the request.\n- The same failure repeats twice without new evidence.\n- Required information is unavailable and guessing would risk damage.\n- ${maxIterations} iterations have completed.\n\nFailure classification after each verification:\n\n- Current-change regression: introduced by this work; fix before proceeding.\n- Pre-existing failure: document evidence and avoid expanding scope unless asked.\n- Environment failure: report missing dependency, service, credential, or platform issue.\n- Unknown: gather one more diagnostic only if it is safe and likely to reduce uncertainty.\n\nIteration log format:\n\n| Iteration | Observation | Action | Verification | Classification | Next |\n| --- | --- | --- | --- | --- | --- |${verdict}\n`
  },
})

const loopGuardPlugin: Plugin = async () => ({ tool: { loop_guard: loopGuardTool } })

export default loopGuardPlugin
