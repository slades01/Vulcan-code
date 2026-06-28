#!/usr/bin/env node
// VulcanCode codemap CLI — bench (generate + recall timings, JSON output).
// Usage: node tools/codemap/bench.mjs --root <dir> --out <dir> [--query term] [--limit N]
import { benchCodemap } from "./lib.mjs"

const args = parseArgs(process.argv.slice(2))
const res = await benchCodemap({ root: args.root, out: args.out, query: args.query, limit: args.limit })
// bench prints structured JSON (markdown rides along for tool consumers).
process.stdout.write(JSON.stringify(res, null, 2) + "\n")
if (!res.ok) process.exitCode = 1

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--root") out.root = argv[++i]
    else if (a === "--out") out.out = argv[++i]
    else if (a === "--query") out.query = argv[++i]
    else if (a === "--limit") out.limit = Number(argv[++i])
    else if (a === "-h" || a === "--help") {
      process.stdout.write("Usage: bench.mjs --root <dir> --out <dir> [--query term] [--limit N]\n")
      process.exit(0)
    }
  }
  return out
}
