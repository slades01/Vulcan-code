#!/usr/bin/env node
// Deterministic non-secret Code Memory smoke for VulcanCode setup/package gates.
// The global setup root is intentionally credential-guarded by codemap, so this
// script creates a tiny fixture under the pre-approved temp area and runs codemap
// operations there.
import fs from "fs/promises"
import { createHash } from "crypto"
import os from "os"
import path from "path"
import { benchCodemap, generateCodemap, healthCodemap, recallCodemap } from "../tools/codemap/lib.mjs"

const op = (process.argv[2] || "bench").toLowerCase()
const query = process.argv.slice(3).join(" ") || "greet"
const fixtureId = createHash("sha256").update(path.resolve(process.cwd())).digest("hex").slice(0, 12)
const fixtureRoot = path.join(os.tmpdir(), "opencode", `vulcan-codemap-smoke-${fixtureId}`)
const srcDir = path.join(fixtureRoot, "src")
const out = path.join(fixtureRoot, ".opencode", "codemap")

await fs.mkdir(srcDir, { recursive: true })
await fs.writeFile(
  path.join(srcDir, "main.ts"),
  [
    "import { greet } from './util'",
    "",
    "export function runSmoke(name: string) {",
    "  return greet(name)",
    "}",
    "",
  ].join("\n"),
  "utf8",
)
await fs.writeFile(
  path.join(srcDir, "util.ts"),
  [
    "export function greet(name: string) {",
    "  return `hello ${name}`",
    "}",
    "",
  ].join("\n"),
  "utf8",
)

let res
if (op === "generate") res = await generateCodemap({ root: fixtureRoot, out })
else if (op === "health") {
  await generateCodemap({ root: fixtureRoot, out })
  res = await healthCodemap({ root: fixtureRoot, out })
}
else if (op === "recall") {
  await generateCodemap({ root: fixtureRoot, out })
  res = await recallCodemap({ root: fixtureRoot, out, query })
}
else if (op === "bench") res = await benchCodemap({ root: fixtureRoot, out, query })
else {
  process.stderr.write(`Unknown op: ${op}\nUsage: node bench/codemap-smoke.mjs [generate|health|recall|bench] [query]\n`)
  process.exit(2)
}

if (op === "bench") process.stdout.write(JSON.stringify(res, null, 2) + "\n")
else process.stdout.write(res.markdown || JSON.stringify(res, null, 2) + "\n")
if (!res.ok) process.exitCode = 1
