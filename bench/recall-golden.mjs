#!/usr/bin/env node
import assert from "assert/strict"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import { pathToFileURL } from "url"
import { excerpt, memoryLineMatchesScope, rankItems, redact, renderRecall, scoreText, scopeTokens } from "../tools/recall_bus_lib.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const fixtures = path.join(root, "bench", "fixtures", "recall")
const redaction = JSON.parse(await fs.readFile(path.join(fixtures, "redaction.json"), "utf8"))
const relevance = JSON.parse(await fs.readFile(path.join(fixtures, "relevance.json"), "utf8"))
const checks = []

check("redacts synthetic sensitive sentinels", () => {
  const input = [...redaction.sentinels, redaction.privateKey].join("\n")
  const output = redact(input)
  for (const sentinel of redaction.sentinels) assert.equal(output.includes(sentinel), false, `leaked ${sentinel}`)
  assert.equal(output.includes("BEGIN PRIVATE KEY"), false, "leaked private key header")
  assert.match(output, /# recall_bus redacted:/)
})

check("redaction is idempotent and clean-text lossless", () => {
  const once = redact(redaction.cleanText)
  const twice = redact(once)
  assert.equal(once, redaction.cleanText)
  assert.equal(twice, once)
})

check("renderRecall redacts query and returned slices before budget trim", () => {
  const hugePrivateKey = `-----BEGIN PRIVATE KEY-----\n${"A".repeat(5000)}\n-----END PRIVATE KEY-----`
  const output = renderRecall({
    query: redaction.sentinels[0],
    budget: 1000,
    limit: 3,
    items: [{ source: "memory-index", score: 3, text: `note ${redaction.sentinels[1]} ${hugePrivateKey}` }],
  })
  assert.equal(output.includes(redaction.sentinels[0]), false, "query leaked")
  assert.equal(output.includes(redaction.sentinels[1]), false, "item leaked")
  assert.equal(output.includes("BEGIN PRIVATE KEY"), false, "private key leaked")
  assert.match(output, /# recall_bus redacted:private-key/, "redacted item should survive budget trim")
})

check("renderRecall excerpts oversized hits without starving later hits", () => {
  const hugePrivateKey = `-----BEGIN PRIVATE KEY-----\n${"A".repeat(5000)}\n-----END PRIVATE KEY-----`
  const output = renderRecall({
    query: "needle compact",
    budget: 1000,
    limit: 3,
    items: [
      { source: "memory-index", score: 100, text: `needle ${"very long prose ".repeat(200)} ${hugePrivateKey}` },
      { source: "speed-ledger", score: 80, text: "compact operational hit survives the budget" },
    ],
  })
  assert.equal(output.includes("BEGIN PRIVATE KEY"), false, "private key leaked")
  assert.match(output, /# recall_bus redacted:private-key/, "redaction marker should survive excerpting")
  assert.match(output, /excerpted by recall_bus/, "oversized hit should be excerpted")
  assert.match(output, /compact operational hit/, "later compact hit should not be starved")
})

check("redact-before-excerpt prevents truncated private-key slices", () => {
  const raw = `needle -----BEGIN PRIVATE KEY-----\n${"A".repeat(5000)}\n-----END PRIVATE KEY-----`
  const safeExcerpt = excerpt(redact(raw), "needle")
  assert.equal(safeExcerpt.includes("BEGIN PRIVATE KEY"), false, "truncated key header leaked")
  assert.match(safeExcerpt, /# recall_bus redacted:private-key/)
})

check("cross-source ranking keeps structural codemap hit above wordy memory hit", () => {
  const ranked = rankItems(relevance.items, 2)
  assert.equal(ranked[0].source, "codemap")
})

check("relevance magnitude can beat source priority", () => {
  const ranked = rankItems(relevance.magnitudeItems, 2)
  assert.equal(ranked[0].source, "speed-ledger")
  assert.equal(ranked[1].source, "codemap")
})

check("single common-word matches do not pollute recall", () => {
  assert.equal(scoreText("A design note about the world model and user system.", "mission state continuation hash"), 0)
  assert.equal(scoreText("A generic note about state updates and setup.", "mission state continuation hash"), 0)
})

check("stopword-only queries fall back to coarse recall", () => {
  assert.ok(scoreText("The task tool routing note stays discoverable.", "task tool") > 0)
})

check("memory scope filters whole tag tokens only", () => {
  assert.deepEqual(scopeTokens("vulcancode, opencode/speed"), ["vulcancode", "opencode", "speed"])
  assert.equal(memoryLineMatchesScope(relevance.memoryLines.vulcancode, "vulcancode"), true)
  assert.equal(memoryLineMatchesScope(relevance.memoryLines.moemoney, "vulcancode"), false)
  assert.equal(memoryLineMatchesScope(relevance.memoryLines.vulcancode, "code"), false)
  assert.equal(memoryLineMatchesScope(relevance.memoryLines.fastcode, "code"), false)
  assert.equal(memoryLineMatchesScope(relevance.memoryLines.fastcode, "vulcancode fastcode"), true)
  assert.equal(memoryLineMatchesScope(relevance.memoryLines.moemoney, ""), true)
})

check("scoped memory recall removes design-prose collisions", () => {
  const lines = [relevance.memoryLines.vulcancode, relevance.memoryLines.moemoney]
  const scoped = lines
    .filter((line) => memoryLineMatchesScope(line, "vulcancode"))
    .map((line) => ({ source: "memory-index", score: scoreText(line, "recall memory update"), text: line }))
  assert.equal(scoped.length, 1)
  assert.equal(scoped[0].text.includes("VulcanCode"), true)
})

check("frozen relevance triples hit expected source in top 3", () => {
  for (const row of relevance.queries) {
    const scored = relevance.items.map((item) => ({
      ...item,
      score: scoreText(item.text, row.query),
    })).filter((item) => item.score > 0)
    const top3 = rankItems(scored, 3).map((item) => item.source)
    assert.ok(top3.includes(row.expectedTop3), `${row.query} missed ${row.expectedTop3}; top3=${top3.join(",")}`)
  }
})

await checkAsync("actual recall_bus enumerates current VulcanCode spec files", async () => {
  const tmp = await fs.mkdtemp(path.join(osTmp(), "vulcan-recall-spec-"))
  try {
    const setupRoot = path.join(tmp, "setup")
    const specDir = path.join(setupRoot, "spec")
    await fs.mkdir(specDir, { recursive: true })
    await fs.writeFile(
      path.join(specDir, "VULCANCODE_RECALL_SPEC_SOURCE_2026-06-28.md"),
      "Tiered Retrieval Bus redacted hit@3 relevance bench dynamic spec source coverage.",
    )
    await fs.writeFile(
      path.join(specDir, "VULCANCODE_RND_2026-06-27.md"),
      "Historical long-horizon R&D note that should not be the only spec source.",
    )
    const mod = await import(`${pathToFileURL(path.join(root, "tools", "recall_bus.ts")).href}?spec-source=${Date.now()}`)
    const plugin = await mod.default()
    const output = await plugin.tool.recall_bus.execute({
      query: "Tiered Retrieval Bus redacted hit@3",
      root: tmp,
      setupRoot,
      budget: 2500,
      limit: 5,
    })
    assert.match(output, /## rnd-spec/, "dynamic spec source did not produce an rnd-spec hit")
    assert.match(output, /VULCANCODE_RECALL_SPEC_SOURCE_2026-06-28\.md/, "current spec file was not surfaced")
  } finally {
    await fs.rm(tmp, { recursive: true, force: true })
  }
})

for (const result of checks) console.log(`CHECK ${result.ok ? "PASS" : "FAIL"} ${result.name}${result.detail ? `: ${result.detail}` : ""}`)
const failed = checks.filter((result) => !result.ok)
console.log(`METRIC recall_golden_checks=${checks.length}`)
console.log(`METRIC recall_golden_failed=${failed.length}`)
if (failed.length) process.exitCode = 1

function check(name, fn) {
  try {
    fn()
    checks.push({ name, ok: true })
  } catch (err) {
    checks.push({ name, ok: false, detail: err?.message || String(err) })
  }
}

async function checkAsync(name, fn) {
  try {
    await fn()
    checks.push({ name, ok: true })
  } catch (err) {
    checks.push({ name, ok: false, detail: err?.message || String(err) })
  }
}

function osTmp() {
  return process.env.TMPDIR || process.env.TEMP || process.env.TMP || "/tmp"
}
