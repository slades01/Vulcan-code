#!/usr/bin/env node
// VulcanCode codemap CLI — health (drift/staleness check of the overlay).
// Usage: node tools/codemap/health.mjs --root <dir> --out <dir> [--staleThreshold Ms]
import { healthCodemap } from "./lib.mjs"

const args = parseArgs(process.argv.slice(2))
const res = await healthCodemap({ root: args.root, out: args.out, staleThreshold: args.staleThreshold })
process.stdout.write(res.markdown)
if (!res.ok) process.exitCode = 1

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--root") out.root = argv[++i]
    else if (a === "--out") out.out = argv[++i]
    else if (a === "--staleThreshold") out.staleThreshold = Number(argv[++i])
    else if (a === "-h" || a === "--help") {
      process.stdout.write("Usage: health.mjs --root <dir> --out <dir> [--staleThreshold Ms]\n")
      process.exit(0)
    }
  }
  return out
}
