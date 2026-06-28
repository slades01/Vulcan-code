import { type Plugin, tool } from "@opencode-ai/plugin"
import { createHash } from "crypto"
import fs from "fs/promises"
import path from "path"

type Lease = {
  glob: string
  holder: string
  acquired_at: string
  expires_at: string
}

type State = {
  goal: string
  acceptance: string[]
  verification_target: string
  tier: string
  zones: Lease[]
  todo: { item: string; status: string }[]
  loop: { iterations: number; last_classification: string; same_cause_streak: number }
  compaction: { epoch: number; continuation_hash: string; last_verified_epoch: number }
  files_touched: string[]
  risks: string[]
  next_safe_action: string
  updated_at: string
}

const DEFAULT_STATE: State = {
  goal: "",
  acceptance: [],
  verification_target: "",
  tier: "T1",
  zones: [],
  todo: [],
  loop: { iterations: 0, last_classification: "", same_cause_streak: 0 },
  compaction: { epoch: 0, continuation_hash: "", last_verified_epoch: 0 },
  files_touched: [],
  risks: [],
  next_safe_action: "",
  updated_at: "",
}

function str(v: unknown, fallback = "") {
  const s = v == null ? "" : String(v)
  return s.trim() || fallback
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => str(x)).filter(Boolean)
  const s = str(v)
  return s ? [s] : []
}

function statePath(root: string) {
  return path.join(root, ".opencode", "run", "state.json")
}

function sha(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

async function readState(root: string): Promise<State> {
  try {
    const parsed = JSON.parse(await fs.readFile(statePath(root), "utf8"))
    return { ...DEFAULT_STATE, ...parsed, zones: Array.isArray(parsed.zones) ? parsed.zones : [] }
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") return { ...DEFAULT_STATE }
    throw err
  }
}

async function writeState(root: string, state: State) {
  const file = statePath(root)
  await fs.mkdir(path.dirname(file), { recursive: true })
  const next = { ...state, updated_at: new Date().toISOString() }
  next.compaction.continuation_hash = sha({
    goal: next.goal,
    acceptance: next.acceptance,
    verification_target: next.verification_target,
    tier: next.tier,
    zones: next.zones.map((z) => ({ glob: z.glob, holder: z.holder })),
    todo: next.todo,
    loop: next.loop,
    next_safe_action: next.next_safe_action,
  })
  await fs.writeFile(file, JSON.stringify(next, null, 2) + "\n")
  return next
}

function normalizeGlob(glob: string) {
  return glob.replace(/\\/g, "/").replace(/\*\*/g, "*").replace(/\*+/g, "*").replace(/\/+/g, "/")
}

function overlap(a: string, b: string) {
  const left = normalizeGlob(a)
  const right = normalizeGlob(b)
  if (left === right || left === "*" || right === "*") return true
  const lp = left.replace(/\*.*$/, "")
  const rp = right.replace(/\*.*$/, "")
  return Boolean(lp && rp && (lp.startsWith(rp) || rp.startsWith(lp)))
}

function pruneExpired(zones: Lease[]) {
  const now = Date.now()
  return zones.filter((z) => Date.parse(z.expires_at) > now)
}

const missionStateTool = tool({
  description:
    "VulcanCode Mission State Store: create/read/update .opencode/run/state.json, acquire/release one-writer file-zone leases, tick loop counters, and verify continuation hashes. No network; never stores secrets.",
  args: {
    op: tool.schema.string().describe("Operation: init | snapshot | acquire-zone | release-zone | tick | verify-continuation."),
    root: tool.schema.string().optional().describe("Project root. Defaults to current working directory."),
    goal: tool.schema.string().optional(),
    acceptance: tool.schema.any().optional(),
    verification: tool.schema.string().optional(),
    tier: tool.schema.string().optional(),
    glob: tool.schema.string().optional().describe("File-zone glob for acquire/release."),
    holder: tool.schema.string().optional().describe("Lease holder id."),
    ttlMs: tool.schema.number().optional().describe("Lease TTL in ms. Defaults to 2 hours."),
    classification: tool.schema.string().optional().describe("Loop failure classification for tick."),
    next: tool.schema.string().optional().describe("Next safe action."),
    expectedHash: tool.schema.string().optional().describe("Expected continuation hash for verify-continuation."),
  },
  async execute(args) {
    const op = str(args.op).toLowerCase()
    const root = path.resolve(str(args.root, process.cwd()))
    const state = await readState(root)
    state.zones = pruneExpired(state.zones)

    if (op === "init") {
      const next = await writeState(root, {
        ...state,
        goal: str(args.goal, state.goal),
        acceptance: arr(args.acceptance).length ? arr(args.acceptance) : state.acceptance,
        verification_target: str(args.verification, state.verification_target),
        tier: str(args.tier, state.tier || "T1"),
        next_safe_action: str(args.next, state.next_safe_action),
      })
      return render("MISSION_STATE_INIT", root, next)
    }

    if (op === "snapshot") return render("MISSION_STATE_SNAPSHOT", root, state)

    if (op === "acquire-zone") {
      const glob = str(args.glob)
      const holder = str(args.holder)
      if (!glob || !holder) return "# mission_state blocked\n\n`acquire-zone` requires `glob` and `holder`."
      const conflict = state.zones.find((z) => z.holder !== holder && overlap(z.glob, glob))
      if (conflict) return `# LEASE_CONFLICT\n\n- Requested: \`${glob}\` by \`${holder}\`\n- Held: \`${conflict.glob}\` by \`${conflict.holder}\` until ${conflict.expires_at}\n`
      const ttl = Math.max(60_000, Math.min(86_400_000, Number(args.ttlMs || 7_200_000)))
      state.zones = state.zones.filter((z) => !(z.holder === holder && z.glob === glob))
      state.zones.push({ glob, holder, acquired_at: new Date().toISOString(), expires_at: new Date(Date.now() + ttl).toISOString() })
      return render("LEASE_ACQUIRED", root, await writeState(root, state))
    }

    if (op === "release-zone") {
      const glob = str(args.glob)
      const holder = str(args.holder)
      state.zones = state.zones.filter((z) => !(z.holder === holder && (!glob || z.glob === glob)))
      return render("LEASE_RELEASED", root, await writeState(root, state))
    }

    if (op === "tick") {
      const classification = str(args.classification, state.loop.last_classification)
      state.loop = {
        iterations: state.loop.iterations + 1,
        last_classification: classification,
        same_cause_streak: classification && classification === state.loop.last_classification ? state.loop.same_cause_streak + 1 : 1,
      }
      state.next_safe_action = str(args.next, state.next_safe_action)
      const next = await writeState(root, state)
      const verdict = next.loop.same_cause_streak >= 2 ? "ESCALATE_STRATEGY" : "CONTINUE"
      return render(verdict, root, next)
    }

    if (op === "verify-continuation") {
      const expected = str(args.expectedHash)
      if (!expected) {
        return `# CONTINUATION_BLOCKED\n\n- Root: \`${root}\`\n- Expected: \`<missing>\`\n- Actual: \`${state.compaction.continuation_hash || "<missing>"}\`\n- Next: provide \`expectedHash\`; refusing to verify the state against itself.\n`
      }
      const verdict = expected && expected === state.compaction.continuation_hash ? "OK" : "DRIFTED"
      if (verdict === "OK") {
        state.compaction.last_verified_epoch = state.compaction.epoch
        await writeState(root, state)
      }
      return `# CONTINUATION_${verdict}\n\n- Root: \`${root}\`\n- Expected: \`${expected || "<missing>"}\`\n- Actual: \`${state.compaction.continuation_hash || "<missing>"}\`\n`
    }

    return "# mission_state blocked\n\nUnknown op. Use `init`, `snapshot`, `acquire-zone`, `release-zone`, `tick`, or `verify-continuation`."
  },
})

function render(title: string, root: string, state: State) {
  return `# ${title}\n\n- Root: \`${root}\`\n- State: \`${statePath(root)}\`\n- Goal: ${state.goal || "-"}\n- Verification: ${state.verification_target || "-"}\n- Tier: ${state.tier || "-"}\n- Leases: ${state.zones.length}\n- Loop: ${state.loop.iterations} iteration(s), same-cause streak ${state.loop.same_cause_streak}\n- Continuation hash: \`${state.compaction.continuation_hash || "<none>"}\`\n- Next: ${state.next_safe_action || "-"}\n`
}

const missionStatePlugin: Plugin = async () => ({ tool: { mission_state: missionStateTool } })

export default missionStatePlugin
