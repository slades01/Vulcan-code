import { type Plugin, tool } from "@opencode-ai/plugin"
import fs from "fs/promises"
import path from "path"

const TIERS = ["T0", "T1", "T2", "T3"] as const

async function metricsVerdict(root: string) {
  try {
    const file = path.join(root, ".opencode", "run", "metrics.jsonl")
    const lines = (await fs.readFile(file, "utf8")).trim().split(/\r?\n/).filter(Boolean).slice(-20)
    return `\n\nStructured pace verdict: **measured** — metrics tail has ${lines.length} event line(s). Keep T0/T1 floor; inspect tail if phase budget is exceeded.`
  } catch {
    return "\n\nStructured pace verdict: **unmeasured** — no metrics tail found; use declared ceilings and do not skip T0/T1."
  }
}

const paceGuardTool = tool({
  description: "Create a wall-clock pace contract with phase budgets, batching rules, verification tiers, speculative-lane discard rules, barrier escalation, and optional metrics-tail verdict.",
  args: {
    goal: tool.schema.string().describe("The outcome being accelerated."),
    verificationTier: tool.schema.string().optional().describe("Minimum verification tier to reach. Use T0, T1, T2, or T3. Defaults to T1."),
    speculativeLanes: tool.schema.number().optional().describe("Read-only speculative lanes to allow. Defaults to 0, max 2."),
    phaseBudget: tool.schema.string().optional().describe("Optional custom phase budget. Otherwise use the default percentage split."),
    editingMission: tool.schema.boolean().optional().describe("Whether this mission edits code/config. Defaults to true."),
    root: tool.schema.string().optional().describe("Project root for optional .opencode/run/metrics.jsonl tail verdict."),
  },
  async execute(args) {
    const goal = String(args.goal || "").trim()
    const requestedTier = String(args.verificationTier || "T1").trim().toUpperCase()
    if (!(TIERS as readonly string[]).includes(requestedTier)) return `# Pace Contract Blocked\n\nInvalid verification tier: ${requestedTier || "<empty>"}. Use T0, T1, T2, or T3.`
    const editingMission = args.editingMission !== false
    const rawSpeculative = Number(args.speculativeLanes || 0)
    const speculativeLanes = Number.isFinite(rawSpeculative) ? Math.max(0, Math.min(2, Math.floor(rawSpeculative))) : 0
    const phaseBudget = String(args.phaseBudget || "Phase ceilings: discovery/R&D <=20%; planning/synthesis <=15%; implementation <=35%; verification <=25%; review/repair <=20% (ceilings may overlap; they are not a 100% partition)").trim()
    if (!goal) return "Blocked: define the pace goal before starting accelerated execution."
    if (editingMission && requestedTier === "T0") return `# Pace Contract Blocked\n\nGoal: ${goal}\n\nEditing missions must not stop at T0. Set minimum verification tier to T1 or higher so a meaningful targeted check/repro runs before final.`
    const verdict = await metricsVerdict(String(args.root || process.cwd()))
    return `# Pace Contract\n\nGoal: ${goal}\n\nPhase budget: ${phaseBudget}\n\nMinimum verification tier: ${requestedTier}\n\nSpeculative read-only lanes allowed: ${speculativeLanes}\n\nExecution rules:\n\n1. Batch: issue independent read-only tool calls in one assistant turn. Do not serialize glob/grep/read/MCP fetches when they can run together.\n2. Dispatch: launch independent read-only lanes together; keep edit lanes serial by file-ownership zone.\n3. Verification ladder: T0 targeted static/smoke/diff check -> T1 smallest meaningful test/repro -> T2 broader suite/build slice -> T3 full/deep/benchmark/fuzz.\n4. Safety floor: non-trivial editing work must reach T0 and T1 before final. Time pressure may drop T2/T3, not T0/T1.\n5. Speculation: speculative lanes must be read-only and explicitly marked. Discard unresolved outputs when the primary path resolves unless they report a concrete safety issue.\n6. Barrier escalation: at each synthesis barrier, abandon or summarize any lane past 1.5x SLO with no new evidence.\n7. Stop: if the phase budget is exhausted before the minimum verification tier is green, stop with a precise handoff instead of widening scope or skipping verification.\n\nPace log format:\n\n| Phase | Budget%/SLO | Batch? | Verification Tier | Speculative? | Escalation/Discard | Evidence |\n| --- | --- | --- | --- | --- | --- | --- |${verdict}\n`
  },
})

const paceGuardPlugin: Plugin = async () => ({ tool: { pace_guard: paceGuardTool } })

export default paceGuardPlugin
