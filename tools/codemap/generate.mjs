#!/usr/bin/env node
// VulcanCode codemap CLI — generate (Extract -> Cognify -> Load).
// Usage: node tools/codemap/generate.mjs --root <dir> --out <dir> [--limit N]
import { generateCodemap } from "./lib.mjs"

const args = parseArgs(process.argv.slice(2))
const res = await generateCodemap({ root: args.root, out: args.out, limit: args.limit })
process.stdout.write(res.markdown)
if (!res.ok) process.exitCode = 1

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--root") out.root = argv[++i]
    else if (a === "--out") out.out = argv[++i]
    else if (a === "--limit") out.limit = Number(argv[++i])
    else if (a === "-h" || a === "--help") {
      process.stdout.write("Usage: generate.mjs --root <dir> --out <dir> [--limit N]\n")
      process.exit(0)
    }
  }
  return out
}
