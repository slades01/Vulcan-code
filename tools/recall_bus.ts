import { type Plugin, tool } from "@opencode-ai/plugin"
import fs from "fs/promises"
import os from "os"
import path from "path"
import { excerpt, memoryLineMatchesScope, redact, renderRecall, scoreText, str } from "./recall_bus_lib.mjs"

type CodemapLib = typeof import("./codemap/lib.mjs")

let libPromise: Promise<CodemapLib> | null = null
function loadLib() {
  if (!libPromise) libPromise = import("./codemap/lib.mjs") as Promise<CodemapLib>
  return libPromise
}

// Portable default setup root: ~/.config/opencode on this machine. No hardcoded
// per-user absolute path is shipped in the package.
function defaultSetupRoot() {
  return path.join(os.homedir(), ".config", "opencode")
}

async function readMaybe(file: string) {
  try {
    return await fs.readFile(file, "utf8")
  } catch {
    return ""
  }
}

async function memoryEntries(setupRoot: string, query: string, scope?: string) {
  const index = await readMaybe(path.join(setupRoot, "memory-index.md"))
  return index
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- "))
    .filter((line) => memoryLineMatchesScope(line, scope))
    .map((line) => ({ source: "memory-index", score: scoreText(line, query), text: line }))
    .filter((item) => item.score > 0)
}

async function fileEntry(source: string, file: string, query: string) {
  const content = await readMaybe(file)
  if (!content) return []
  const s = scoreText(content, query)
  // Redact before excerpting so a budget-sized slice cannot separate a secret
  // block's BEGIN/END markers and bypass whole-block redaction downstream.
  return s ? [{ source, score: s, text: `${file}: ${excerpt(redact(content), query)}` }] : []
}

async function specEntries(setupRoot: string, query: string) {
  const dir = path.join(setupRoot, "spec")
  let files: string[]
  try {
    files = await fs.readdir(dir)
  } catch {
    return []
  }

  const hits = await Promise.all(
    files
      .filter((file) => /^VULCANCODE_.*\.md$/i.test(file))
      .sort()
      .map((file) => fileEntry("rnd-spec", path.join(dir, file), query)),
  )
  return hits.flat()
}

const recallBusTool = tool({
  description:
    "VulcanCode Tiered Retrieval Bus: one ranked, redacted, token-budgeted recall over codemap, memory-index, speed ledger, and specs. Returns provenance; no network; skips missing files.",
  args: {
    query: tool.schema.string().describe("Recall query."),
    root: tool.schema.string().optional().describe("Project/source root for codemap recall. Defaults to current working directory."),
    setupRoot: tool.schema.string().optional().describe("VulcanCode setup root. Defaults to ~/.config/opencode for this machine."),
    budget: tool.schema.number().optional().describe("Approximate character budget. Defaults to 5000."),
    limit: tool.schema.number().optional().describe("Max ranked items. Defaults to 12."),
    scope: tool.schema.string().optional().describe("Optional comma/space-separated memory-index tag filter, e.g. 'vulcancode opencode speed'. Only memory-index hits are scoped; codemap/spec/ledger still participate."),
  },
  async execute(args) {
    const query = str(args.query)
    if (!query) return "# recall_bus blocked\n\nMissing query."
    const root = path.resolve(str(args.root, process.cwd()))
    const setupRoot = path.resolve(str(args.setupRoot, defaultSetupRoot()))
    const budget = Math.max(1000, Math.min(20000, Number(args.budget || 5000)))
    const limit = Math.max(1, Math.min(50, Math.floor(Number(args.limit || 12))))
    const items: { source: string; score: number; text: string }[] = []

    try {
      const lib = await loadLib()
      const res = await lib.recallCodemap({ root, query, limit: Math.min(limit, 10) })
      if (res.markdown) {
        const codemapScore = /No matches\./i.test(res.markdown) ? 0 : Math.max(5, scoreText(res.markdown, query))
        items.push({ source: "codemap", score: codemapScore, text: res.markdown })
      }
    } catch (err) {
      items.push({ source: "codemap", score: 0, text: `codemap unavailable: ${(err as Error).message}` })
    }

    items.push(...await memoryEntries(setupRoot, query, str(args.scope)))
    items.push(...await fileEntry("speed-ledger", path.join(setupRoot, "speed", "acceleration-ledger.md"), query))
    items.push(...await specEntries(setupRoot, query))

    return renderRecall({ query, budget, limit, items })
  },
})

const recallBusPlugin: Plugin = async () => ({ tool: { recall_bus: recallBusTool } })

export default recallBusPlugin
