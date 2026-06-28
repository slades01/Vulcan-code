import { type Plugin, tool } from "@opencode-ai/plugin"

type NodeSpec = {
  id?: unknown
  agent?: unknown
  role?: unknown
  mission?: unknown
  inputs?: unknown
  outputs?: unknown
  deps?: unknown
  verification?: unknown
  status?: unknown
}

function text(v: unknown, fallback = ""): string {
  const s = v == null ? "" : String(v)
  return s.trim() || fallback
}

function inline(v: unknown): string {
  return text(v, "-").replace(/`/g, "'").replace(/[\r\n]+/g, " ").slice(0, 240)
}

function mermaidLabel(v: unknown): string {
  return inline(v).replace(/\\/g, "\\\\").replace(/"/g, "'").replace(/[\[\]]/g, " ").replace(/-->/g, "→")
}

function tableCell(v: unknown): string {
  return inline(v).replace(/\|/g, "\\|").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function parseNodes(input: unknown): NodeSpec[] {
  if (Array.isArray(input)) return input as NodeSpec[]
  if (typeof input !== "string" || !input.trim()) return []
  try {
    const parsed = JSON.parse(input)
    return Array.isArray(parsed) ? parsed as NodeSpec[] : []
  } catch {
    return []
  }
}

function depList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => text(x)).filter(Boolean)
  const s = text(v)
  if (!s || s === "-") return []
  return s.split(/[;,\s]+/).map((x) => x.trim()).filter(Boolean)
}

function listCell(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => text(x)).filter(Boolean).join(", ") || "-"
  return text(v, "-")
}

function mermaidId(id: string): string {
  const safe = id.replace(/[^A-Za-z0-9_]/g, "_")
  return safe || "node"
}

function renderPartitionedGraph(goal: string, nodes: NodeSpec[], maxNodes: number): string {
  const partitions: NodeSpec[][] = []
  for (let i = 0; i < nodes.length; i += maxNodes) partitions.push(nodes.slice(i, i + maxNodes))
  const lines = ["```mermaid", "graph TD", "  Q[\"Q: Queen\"]"]
  const table = [
    "| Partition | Nodes | Range | Barrier | Verification |",
    "| --- | --- | --- | --- | --- |",
  ]
  for (let i = 0; i < partitions.length; i++) {
    const id = `P${i + 1}`
    const barrier = `B${i + 1}`
    const first = inline(partitions[i][0]?.id || `N${i * maxNodes + 1}`)
    const last = inline(partitions[i][partitions[i].length - 1]?.id || `N${i * maxNodes + partitions[i].length}`)
    lines.push(`  Q --> ${id}["${id}: nodes ${i * maxNodes + 1}-${i * maxNodes + partitions[i].length}"]`)
    lines.push(`  ${id} --> ${barrier}["${barrier}: reduce + verify"]`)
    if (i > 0) lines.push(`  B${i} --> ${id}`)
    table.push(`| \`${id}\` | ${partitions[i].length} | ${tableCell(first)} → ${tableCell(last)} | \`${barrier}\` | reduce partition, surface conflicts, then release next partition |`)
  }
  lines.push("```")
  return `# Agent Graph\n\nGoal: ${goal || "-"}\n\n**Partitioned:** ${nodes.length} nodes exceed maxNodes=${maxNodes}. No nodes were silently truncated; execute each partition behind its barrier.\n\n${lines.join("\n")}\n\n${table.join("\n")}\n`
}

function renderGraph(goal: string, nodes: NodeSpec[], maxNodes = 512): string {
  if (nodes.length > maxNodes) return renderPartitionedGraph(goal, nodes, maxNodes)
  const normalized = nodes.map((n, i) => {
    const id = inline(n.id || `N${i + 1}`)
    return {
      id,
      mid: mermaidId(id),
      agent: inline(n.agent),
      role: inline(n.role),
      mission: inline(n.mission),
      inputs: listCell(n.inputs),
      outputs: listCell(n.outputs),
      deps: depList(n.deps),
      verification: inline(n.verification),
      status: inline(n.status || "planned"),
    }
  })
  const usedMids = new Set<string>()
  for (const n of normalized) {
    const base = n.mid
    let candidate = base
    let suffix = 2
    while (usedMids.has(candidate)) {
      candidate = `${base}_${suffix}`
      suffix++
    }
    n.mid = candidate
    usedMids.add(candidate)
  }
  const midById = new Map(normalized.map((n) => [n.id, n.mid]))
  const byId = new Set(normalized.map((n) => n.id))
  const lines = ["```mermaid", "graph TD"]
  for (const n of normalized) {
    lines.push(`  ${n.mid}["${mermaidLabel(`${n.id}: ${n.agent || n.role || "node"}`)}"]`)
  }
  for (const n of normalized) {
    for (const dep of n.deps) {
      if (byId.has(dep)) lines.push(`  ${midById.get(dep)} --> ${n.mid}`)
    }
  }
  if (normalized.length === 0) lines.push("  Q[Queen] --> P[Plan]")
  lines.push("```")

  const table = [
    "| Node | Agent | Role | Mission | Inputs | Outputs | Deps | Verification | Status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...normalized.map((n) => `| \`${tableCell(n.id)}\` | ${tableCell(n.agent)} | ${tableCell(n.role)} | ${tableCell(n.mission)} | ${tableCell(n.inputs)} | ${tableCell(n.outputs)} | ${tableCell(n.deps.join(", ") || "-")} | ${tableCell(n.verification)} | ${tableCell(n.status)} |`),
  ]
  if (normalized.length === 0) table.push("| `P` | graph-planner | planner | Define nodes before fan-out | goal | node map | Q | node map present | blocked |")

  return `# Agent Graph\n\nGoal: ${goal || "-"}\n\n${lines.join("\n")}\n\n${table.join("\n")}\n`
}

const agentGraphTool = tool({
  description:
    "Create a compact local agent node map for VulcanCode workflows. Input nodes as JSON array or structured tool args; returns markdown with Mermaid plus node/dependency/verification table. No network, no file reads, no side effects.",
  args: {
    goal: tool.schema.string().optional().describe("Workflow goal or mission statement."),
    nodes: tool.schema.any().optional().describe("Array or JSON string of nodes: {id, agent, role, mission, inputs, outputs, deps, verification, status}."),
    maxNodes: tool.schema.number().optional().describe("Maximum nodes per graph partition. Defaults to 512."),
  },
  async execute(args) {
    const goal = inline(args.goal)
    const nodes = parseNodes(args.nodes)
    const maxNodes = Math.max(1, Math.min(512, Math.floor(Number(args.maxNodes || 512))))
    return renderGraph(goal, nodes, maxNodes)
  },
})

const agentGraphPlugin: Plugin = async () => ({
  tool: {
    agent_graph: agentGraphTool,
  },
})

export default agentGraphPlugin
