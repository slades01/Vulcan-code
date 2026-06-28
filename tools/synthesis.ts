import { type Plugin, tool } from "@opencode-ai/plugin"

function str(v: unknown, fallback = "") {
  const s = v == null ? "" : String(v)
  return s.trim() || fallback
}

function list(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean)
  const s = str(v)
  if (!s) return []
  try {
    const parsed = JSON.parse(s)
    if (Array.isArray(parsed)) return parsed.map((x) => typeof x === "string" ? x : JSON.stringify(x))
  } catch {}
  return s.split(/\n---+\n|\n##\s+/).map((x) => x.trim()).filter(Boolean)
}

function conflictHints(outputs: string[]) {
  const joined = outputs.join("\n").toLowerCase()
  const hints: string[] = []
  if (joined.includes("pass") && joined.includes("fail")) hints.push("Some lanes disagree on pass/fail status.")
  if (joined.includes("safe") && (joined.includes("unsafe") || joined.includes("risk"))) hints.push("Safety/risk conclusions differ across lanes.")
  if (joined.includes("implement") && joined.includes("do not")) hints.push("At least one lane recommends action while another warns against it.")
  return hints
}

const synthesisTool = tool({
  description:
    "Convergence-aware synthesis helper: reduce lane outputs into one decision, conflicts, one falsifier, and residual risk. Deterministic/local; no network.",
  args: {
    goal: tool.schema.string().describe("Synthesis goal."),
    outputs: tool.schema.any().optional().describe("Lane outputs as array or string."),
    decision: tool.schema.string().optional().describe("Proposed single decision. If omitted, tool emits a conservative next-action decision."),
    falsifier: tool.schema.string().optional().describe("One check that could disprove the decision."),
  },
  async execute(args) {
    const goal = str(args.goal)
    const outputs = list(args.outputs)
    if (!goal) return "# synthesis blocked\n\nMissing goal."
    const conflicts = conflictHints(outputs)
    const decision = str(args.decision, outputs.length ? "Proceed with the lowest-risk common recommendation, gated by the falsifier below." : "Gather at least one lane output before implementation.")
    const falsifier = str(args.falsifier, "Run the smallest focused verification command that would fail if this decision is wrong.")
    const residual = conflicts.length ? "Resolve listed conflicts before editing shared file zones." : "No automatic conflict hints found; still require independent review for non-trivial diffs."
    return `# Synthesis Decision\n\nGoal: ${goal}\n\n## One decision\n\n${decision}\n\n## Conflicts\n\n${conflicts.length ? conflicts.map((c) => `- ${c}`).join("\n") : "- None detected by deterministic hints."}\n\n## Falsifier\n\n${falsifier}\n\n## Residual risk\n\n${residual}\n\n## Lane count\n\n${outputs.length}\n`
  },
})

const synthesisPlugin: Plugin = async () => ({ tool: { synthesis: synthesisTool } })

export default synthesisPlugin
