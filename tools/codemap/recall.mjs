#!/usr/bin/env node
// VulcanCode codemap CLI — recall (structural lookup from precomputed graph).
// Usage: node tools/codemap/recall.mjs --root <dir> --out <dir> --query <term> [--limit N]
import { recallCodemap } from "./lib.mjs"

const args = parseArgs(process.argv.slice(2))
const res = await recallCodemap({ root: args.root, out: args.out, query: args.query, limit: args.limit })
process.stdout.write(res.markdown)
if (!res.ok && !res.missing) process.exitCode = 1
// Missing overlay is not a hard failure for recall; exit 0 so callers can branch on text.

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--root") out.root = argv[++i]
    else if (a === "--out") out.out = argv[++i]
    else if (a === "--query") out.query = argv[++i]
    else if (a === "--limit") out.limit = Number(argv[++i])
    else if (a === "-h" || a === "--help") {
      process.stdout.write("Usage: recall.mjs --root <dir> --out <dir> --query <term> [--limit N]\n")
      process.exit(0)
    }
  }
  return out
}
