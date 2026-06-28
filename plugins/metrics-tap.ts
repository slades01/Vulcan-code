import type { Plugin } from "@opencode-ai/plugin"
import { createHash } from "crypto"
import fs from "fs/promises"
import path from "path"

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value ?? null).slice(0, 4000)).digest("hex").slice(0, 16)
}

let pending = 0
let lastHash = ""
let lastType = "event"
let lastFlush = 0

async function appendMetric() {
  const root = process.cwd()
  const dir = path.join(root, ".opencode", "run")
  const file = path.join(dir, "metrics.jsonl")
  const record = {
    ts: new Date().toISOString(),
    event: lastType,
    event_count: pending,
    args_hash: lastHash,
  }
  pending = 0
  await fs.mkdir(dir, { recursive: true })
  await fs.appendFile(file, JSON.stringify(record) + "\n")
}

const metricsTap: Plugin = async () => ({
  event: async (input: unknown) => {
    try {
      pending++
      lastHash = hash(input)
      lastType = typeof input === "object" && input && "type" in input ? String((input as { type?: unknown }).type) : "event"
      const now = Date.now()
      if (now - lastFlush < 1000) return
      lastFlush = now
      await appendMetric()
    } catch {
      // Metrics must never break the user path. Verification lives in the tool/bench layer.
    }
  },
} as any)

export default metricsTap
