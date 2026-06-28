import { type Plugin, tool } from "@opencode-ai/plugin"

// VulcanCode Codemap Health — quick overlay health/drift check.
//
// Thin wrapper over tools/codemap/lib.mjs healthCodemap() so agents can answer
// "is the code-memory overlay present and in sync?" in one cheap call without
// the full code_memory tool surface. Returns markdown.

type CodemapLib = typeof import("./codemap/lib.mjs")

let libPromise: Promise<CodemapLib> | null = null
function loadLib(): Promise<CodemapLib> {
  if (!libPromise) {
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

const codemapHealthTool = tool({
  description:
    "Quick health check for the VulcanCode code-memory overlay (.opencode/codemap). Reports status (ok/stale/missing/drift), age, file drift (unchanged/changed/added/removed), and secret-flagged count. Use before trusting structural recall or when deciding whether to regenerate.",
  args: {
    root: tool.schema.string().optional().describe("Repo root. Defaults to the current working directory."),
    out: tool.schema.string().optional().describe("Overlay dir. Defaults to <root>/.opencode/codemap."),
    staleThreshold: tool.schema.number().optional().describe("Staleness threshold in ms (default 24h)."),
  },
  async execute(args) {
    const root = str(args.root) || undefined
    const out = str(args.out) || undefined
    const staleThreshold = num(args.staleThreshold)

    let lib: CodemapLib
    try {
      lib = await loadLib()
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : String(err)
      return "# codemap_health failure\n\n- Stage: `load engine`\n- Error: " + msg + "\n"
    }

    try {
      const res = await lib.healthCodemap({ root, out, staleThreshold })
      return res.markdown
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : String(err)
      return "# codemap_health failure\n\n- Stage: `health`\n- Error: " + msg + "\n"
    }
  },
})

const codemapHealthPlugin: Plugin = async () => ({
  tool: {
    codemap_health: codemapHealthTool,
  },
})

export default codemapHealthPlugin
