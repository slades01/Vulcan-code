import { type Plugin, tool } from "@opencode-ai/plugin"

// VulcanCode Code Memory — plugin tool wrapping the deterministic local
// code-graph engine in tools/codemap/lib.mjs (Extract -> Cognify -> Load).
//
// The engine is dynamically imported on first use so the runtime pays nothing
// for it unless an agent actually calls code_memory. Normal failures (missing
// overlay, unreadable root, empty query) return Blocked/Failure markdown rather
// than throwing; only truly unexpected errors are surfaced as a Failure string.
//
// ops:
//   generate  -> rebuild .opencode/codemap/{nodes.jsonl,edges.jsonl,manifest.json}
//   recall    -> structural lookup from the precomputed graph (markdown)
//   health    -> drift/staleness check of the overlay (markdown)
//   bench     -> generate + recall timings (JSON)

type CodemapLib = typeof import("./codemap/lib.mjs")

let libPromise: Promise<CodemapLib> | null = null
function loadLib(): Promise<CodemapLib> {
  if (!libPromise) {
    // Relative dynamic import resolves against this plugin file's location at
    // runtime (opencode loads plugins via Bun's import() from the resolved
    // file path), landing on tools/codemap/lib.mjs.
    libPromise = import("./codemap/lib.mjs") as Promise<CodemapLib>
  }
  return libPromise
}

function str(v: unknown, fallback = ""): string {
  const s = v == null ? "" : String(v)
  return s.trim() || fallback
}

function num(v: unknown): number | undefined {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

const codeMemoryTool = tool({
  description:
    "VulcanCode Code Memory: a deterministic local code-graph overlay (Extract->Cognify->Load into .opencode/codemap). Use op=generate to build the graph, op=recall to look up files/symbols/edges from the precomputed graph (much faster than rebuilding cartography), op=health to check drift/staleness, op=bench to time generate vs recall. Returns markdown (JSON for bench). Never persists secrets.",
  args: {
    op: tool.schema.string().describe("Operation: generate | recall | health | bench."),
    query: tool.schema.string().optional().describe("Search term for recall/bench (symbol/file name, path fragment, signature text)."),
    root: tool.schema.string().optional().describe("Repo root to scan. Defaults to the current working directory."),
    out: tool.schema.string().optional().describe("Output dir for the overlay. Defaults to <root>/.opencode/codemap."),
    limit: tool.schema.number().optional().describe("generate: max files. recall: max results (default 20). bench: recall result cap."),
  },
  async execute(args) {
    const op = str(args.op).toLowerCase()
    const query = str(args.query)
    const root = str(args.root) || undefined
    const out = str(args.out) || undefined
    const limit = num(args.limit)

    const validOps = ["generate", "recall", "health", "bench"]
    if (!validOps.includes(op)) {
      return `# code_memory blocked\n\n- Unknown op: \`${op || "<empty>"}\`.\n- Valid ops: ${validOps.map((o) => "`" + o + "`").join(", ")}.\n`
    }

    let lib: CodemapLib
    try {
      lib = await loadLib()
    } catch (err) {
      return failureMarkdown("load engine", err)
    }

    try {
      if (op === "generate") {
        const res = await lib.generateCodemap({ root, out, limit })
        return res.markdown
      }
      if (op === "recall") {
        const res = await lib.recallCodemap({ root, out, query, limit })
        return res.markdown
      }
      if (op === "health") {
        const res = await lib.healthCodemap({ root, out })
        return res.markdown
      }
      // bench -> JSON
      const res = await lib.benchCodemap({ root, out, query, limit })
      return JSON.stringify(res, null, 2)
    } catch (err) {
      return failureMarkdown(op, err)
    }
  },
})

function failureMarkdown(stage: string, err: unknown): string {
  const msg = err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
    ? (err as { message: string }).message
    : String(err)
  return (
    "# code_memory failure\n\n" +
    "- Stage: `" + stage + "`\n" +
    "- Error: " + msg + "\n\n" +
    "No destructive action was taken. If a credential-like path was involved it was correctly excluded.\n"
  )
}

const codeMemoryPlugin: Plugin = async () => ({
  tool: {
    code_memory: codeMemoryTool,
  },
})

export default codeMemoryPlugin
