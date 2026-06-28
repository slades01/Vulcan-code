#!/usr/bin/env node
import fs from "fs/promises"
import os from "os"
import path from "path"
import { spawn } from "child_process"
import { performance } from "perf_hooks"
import { fileURLToPath } from "url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const tasksDir = path.join(root, "bench", "tasks")
const scorecard = path.join(root, "bench", "scorecard.md")
const change = process.argv.slice(2).join(" ") || "VulcanCode benchmark gate run"
const noScorecard = process.env.VULCAN_BENCH_NO_SCORECARD === "1"
const negativeControl = process.env.VULCAN_BENCH_NEGATIVE_CONTROL === "1"
// Live-identity / shim-target checks couple to a specific branded runtime build
// and install path. They are opt-in so the package gate stays portable.
const liveIdentity = process.env.VULCAN_BENCH_LIVE_IDENTITY === "1"
const gateMode = "executable"
const gateModeSignal = `gate_mode=${gateMode}`
const PRIVATE_ABSOLUTE_PATH = /(?:[A-Z]:[\\/]+Users[\\/]+[^\\/\s"'`|]+|\/(?:Users|home)\/[^\/\s"'`|]+|\/root(?:\/|\b))/i

// Portable presence set: ships the in-package helper workflow tools. Checked by
// file existence only — never by a host-specific absolute path or runtime version.
const HELPER_TOOLS = [
  "tools/recall_bus.ts",
  "tools/recall_bus_lib.mjs",
  "tools/recall_bus_lib.d.mts",
  "tools/synthesis.ts",
  "tools/mission_state.ts",
  "tools/agent_graph.ts",
  "tools/loop_guard.ts",
  "tools/pace_guard.ts",
  "tools/code_memory.ts",
  "tools/codemap_health.ts",
  "plugins/metrics-tap.ts",
]

// Task files are prompts, not tests. Each task must be bound to at least one
// deterministic local check so the executable scorecard cannot over-claim that a
// parse-only markdown bullet count verified behavior.
const TASK_BINDINGS = {
  "helper-tools-present.md": ["helper-tools", "recall-bus:portable-root", "helper-tools:no-private-paths"],
  "lease-conflict.md": ["mission-state:lease-source"],
  "long-horizon-continuation.md": ["mission-state:continuation-fixture", "mission-state:continuation-hash"],
  "model-diverse-review.md": ["review-guidance:source"],
  "post-restart-upgrade-smoke.md": ["runtime:where-vulcan", "runtime:vulcan-version", "config:startup", "config:config", "config:agent-orchestrator", "config:agent-list", "config:mcp-list"],
  "rung2-spec-gate.md": ["agent-graph:source", "orchestrator:rung2-source"],
  "setup-health-audit.md": ["runtime:where-vulcan", "config:startup", "config:config", "config:agent-orchestrator", "config:agent-list", "config:mcp-list"],
  "swarm-converge.md": ["synthesis:source", "agent-graph:source"],
}

const taskFiles = (await fs.readdir(tasksDir)).filter((f) => f.endsWith(".md")).sort()
const started = performance.now()
const results = []
const checks = []

for (const file of taskFiles) {
  const content = await fs.readFile(path.join(tasksDir, file), "utf8")
  const expected = content.split(/\r?\n/).filter((line) => line.trim().startsWith("- ")).length
  const status = expected > 0 ? "pass" : "fail"
  results.push({ file: `tasks/${file}`, status, expected })
  checks.push({ label: `parse:${file}`, ms: 0, status, detail: `${expected} expected signal(s); parse only, see task-coverage` })
}

const hasPostRestartSmoke = taskFiles.includes("post-restart-upgrade-smoke.md")
const hasContinuationTask = hasPostRestartSmoke || taskFiles.includes("long-horizon-continuation.md")

// Kick off the independent read-only batch immediately. These have no vulcan
// dependency, so they run concurrently with the where-vulcan gate and the
// vulcan-dependent batch below. Order is preserved by Promise.all.
const independentPromises = [
  runShell("codemap:bench", "npm run --silent codemap:bench"),
  runShell("recall:golden", "npm run --silent bench:recall"),
  checkFiles("helper-tools", HELPER_TOOLS),
  checkNotRunnableClassifier(),
  checkRecallBusPortableRoot(),
  checkRecallBusSpecSource(),
  checkHelperToolsNoPrivatePaths(),
  checkSourceContains("mission-state:lease-source", "tools/mission_state.ts", ["LEASE_CONFLICT", "function overlap", "acquire-zone", "release-zone"]),
  checkSourceContains("agent-graph:source", "tools/agent_graph.ts", ["renderPartitionedGraph", "maxNodes", "Mermaid", "Verification"]),
  checkSourceContains("synthesis:source", "tools/synthesis.ts", ["One decision", "Conflicts", "Falsifier", "Residual risk"]),
  checkSourceContains("orchestrator:rung2-source", "agent/orchestrator.md", ["Rung 2", "graph-planner", "spec artifact", "file ownership zones"]),
  checkSourceContains("review-guidance:source", "agent/review-lane.md", ["findings", "severity", "residual risk", "testing gaps"]),
  checkContinuationFixture(),
  checkMetricsTapJsonlFixture(),
  checkMetricsTapAmbient(),
]
if (hasContinuationTask) independentPromises.push(checkContinuationState())

const whereCmd = process.platform === "win32" ? "where.exe vulcan" : "command -v vulcan"
const whereVulcan = await runShell("runtime:where-vulcan", whereCmd)
checks.push(whereVulcan)

if (whereVulcan.status === "pass") {
  // Independent read-only vulcan checks run in parallel; order is preserved.
  const vulcanBatch = await Promise.all([
    runShell("runtime:vulcan-version", "vulcan --version"),
    runShell("config:startup", "vulcan debug startup"),
    runShell("config:config", "vulcan debug config"),
    runShell("config:agent-orchestrator", "vulcan debug agent orchestrator"),
    runShell("config:agent-list", "vulcan agent list"),
    runShell("config:mcp-list", "vulcan mcp list"),
  ])
  checks.push(...vulcanBatch)

  if (liveIdentity) {
    const version = vulcanBatch[0]
    const rawVersion = version.stdout.trim()
    const exact = /(^|\s)(1\.0\.0|1\.0)(\s|$)/.test(rawVersion)
    checks.push({
      label: "identity:vulcan-version-1.x",
      ms: 0,
      status: exact ? "pass" : "fail",
      detail: exact ? `vulcan --version is ${quote(rawVersion)}` : `expected VulcanCode 1.0 or 1.0.0, got ${quote(rawVersion)}`,
    })
    checks.push(await checkShimTarget(whereVulcan.stdout))
  }
} else {
  checks.push({ label: "runtime:vulcan-dependent-checks", ms: 0, status: "pending", detail: "vulcan executable not found; config checks not runnable" })
}

// Await the independent batch (already running in parallel with the above).
checks.push(...await Promise.all(independentPromises))

checks.push({ ...checkScorecardValidatorSelfTest(), ms: 0 })
checks.push(checkTaskCoverage(taskFiles, checks))
const scorecardAppendCheck = await checkScorecardAppend()
checks.push(scorecardAppendCheck)
if (negativeControl) checks.push({ label: "negative-control", ms: 0, status: "fail", detail: "VULCAN_BENCH_NEGATIVE_CONTROL=1 forced failure" })

const ms = Math.round(performance.now() - started)
const result = checks.some((c) => c.status === "fail") ? "fail" : checks.some((c) => c.status === "pending") ? "pending" : "pass"
const signal = [gateModeSignal, ...checks.map((c) => `${c.label}=${c.status}@${c.ms ?? 0}ms`)].join("; ")
const residual = result === "pass"
  ? "Deterministic local gate; no model/provider quality benchmark executed"
  : result === "pending"
    ? "One or more required local checks were not runnable; do not promote"
    : "One or more deterministic local checks failed; repair before promotion"
const row = `| ${new Date().toISOString().slice(0, 10)} | ${escapeCell(change)} | ${escapeCell(results.map((r) => r.file).join(", "))} | local/bench-run | ${gateMode} | ${escapeCell(signal)} | ${result} | ${ms} ms | ${escapeCell(residual)} |\n`

if (!noScorecard) {
  if (scorecardAppendCheck.status === "fail") console.error(`SKIP scorecard append: ${scorecardAppendCheck.detail}`)
  else if (result !== "pass") console.error(`SKIP scorecard append: result is ${result}; only pass rows are promotion evidence`)
  else await appendScorecardRow(row)
}
console.log(`METRIC bench_tasks=${results.length}`)
console.log(`METRIC bench_elapsed_ms=${ms}`)
console.log(`METRIC bench_result=${result}`)
console.log(`METRIC gate_mode=${gateMode}`)
for (const check of checks) console.log(`CHECK ${check.status.toUpperCase()} ${check.label}: ${check.detail}`)
console.log(row.trim())
if (result !== "pass") process.exitCode = 1

async function appendScorecardRow(row) {
  try {
    const current = await fs.readFile(scorecard, "utf8")
    const next = renderScorecardWithRow(current, row)
    const validation = validateScorecard(next)
    if (!validation.ok) throw new Error(`refusing malformed scorecard append: ${validation.detail}`)
    await fs.writeFile(scorecard, next)
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : ""
    if (code !== "ENOENT") throw err
    const next = renderNewScorecard(row)
    const validation = validateScorecard(next)
    if (!validation.ok) throw new Error(`refusing malformed scorecard bootstrap: ${validation.detail}`)
    await fs.writeFile(scorecard, next)
  }
}

async function checkScorecardAppend() {
  const t0 = performance.now()
  const previewRow = "| 2000-01-01 | scorecard-append-preview | tasks/preview.md | local/bench-run | executable | gate_mode=executable; scorecard:append-preview=pass | pass | 0 ms | preview only |\n"
  try {
    const current = await fs.readFile(scorecard, "utf8")
    const validation = validateScorecard(renderScorecardWithRow(current, previewRow))
    return {
      label: "scorecard:append-structure",
      ms: Math.round(performance.now() - t0),
      status: validation.ok ? "pass" : "fail",
      detail: validation.ok ? "preview row keeps executable table contiguous" : validation.detail,
    }
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : ""
    if (code === "ENOENT") {
      const validation = validateScorecard(renderNewScorecard(previewRow))
      return { label: "scorecard:append-structure", ms: Math.round(performance.now() - t0), status: validation.ok ? "pass" : "fail", detail: validation.ok ? "missing scorecard would bootstrap with a valid executable table" : validation.detail }
    }
    return { label: "scorecard:append-structure", ms: Math.round(performance.now() - t0), status: "fail", detail: String(err) }
  }
}

function renderNewScorecard(row) {
  const normalizedRow = row.replace(/\s+$/u, "")
  return [
    "# VulcanCode Agent Benchmark Scorecard",
    "",
    "Promotion evidence lives in the executable/manual-evidence table below. Rows under",
    '"Historical — prompt-only, not promotion evidence" are retained only for',
    "provenance and must not be used to promote self-improvement changes.",
    "",
    "| Date | Change | Task | Agent/model | Mode | Verification signal | Result | Time/tokens | Residual risk |",
    "|---|---|---|---|---|---|---|---|---|",
    normalizedRow,
    "",
  ].join("\n")
}

function checkScorecardValidatorSelfTest() {
  const validRow = "| 2000-01-01 | validator-self-test | tasks/preview.md | local/bench-run | executable | gate_mode=executable; self-test=pass | pass | 0 ms | preview only |\n"
  const secondRow = "| 2000-01-02 | validator-self-test-2 | tasks/preview-2.md | local/bench-run | executable | gate_mode=executable; self-test=pass | pass | 1 ms | preview only |\n"
  const failRow = "| 2000-01-03 | validator-self-test-fail | tasks/preview-3.md | local/bench-run | executable | gate_mode=executable; self-test=fail | fail | 2 ms | preview only |\n"
  const pendingRow = "| 2000-01-04 | validator-self-test-pending | tasks/preview-4.md | local/bench-run | executable | gate_mode=executable; self-test=pending | pending | 3 ms | preview only |\n"
  const missingGateModeRow = "| 2000-01-05 | validator-self-test-missing-gate | tasks/preview-5.md | local/bench-run | executable | manual review only | pass | 4 ms | preview only |\n"
  const olderFailRows = renderNewScorecard(`${failRow.trimEnd()}\n${validRow.trimEnd()}\n`)
  const historicalAllowed = renderScorecardWithHistoricalRows(validRow, validRow.replace("| executable |", "| failed-executable-historical |"))
  const historicalPromotionLeak = renderScorecardWithHistoricalRows(validRow, validRow)
  const historicalEmptyMode = renderScorecardWithHistoricalRows(validRow, validRow.replace("| executable |", "|  |"))
  const historicalWrongColumns = renderScorecardWithHistoricalRows(validRow, validRow.replace("| preview only |", "|"))
  const historicalHyphenHeading = historicalAllowed.replace("## Historical — prompt-only, not promotion evidence", "## Historical - prompt-only, not promotion evidence")
  const historicalHyphenLeak = historicalPromotionLeak.replace("## Historical — prompt-only, not promotion evidence", "## Historical - prompt-only, not promotion evidence")
  const valid = renderNewScorecard(validRow)
  const twoRows = renderNewScorecard(`${validRow.trimEnd()}\n${secondRow.trimEnd()}\n`)
  const blankSplitRows = twoRows.replace(secondRow.trimEnd(), `\n${secondRow.trimEnd()}`)
  const historicalLeak = renderNewScorecard(validRow.replace("| executable |", "| prompt-only-historical |"))
  const cases = [
    ["accepts valid table", validateScorecard(valid).ok === true],
    ["rejects missing header", validateScorecard(valid.replace("| Date | Change | Task | Agent/model | Mode | Verification signal | Result | Time/tokens | Residual risk |", "| Broken | Header |")).ok === false],
    ["rejects missing separator", validateScorecard(valid.replace("|---|---|---|---|---|---|---|---|---|", "")).ok === false],
    ["rejects blank split rows", validateScorecard(blankSplitRows).ok === false],
    ["rejects historical row leak", validateScorecard(historicalLeak).ok === false],
    ["rejects wrong column count", validateScorecard(valid.replace("| preview only |", "|")).ok === false],
    ["rejects executable row without gate_mode signal", validateScorecard(renderNewScorecard(missingGateModeRow)).ok === false],
    ["rejects any executable fail row", validateScorecard(olderFailRows).ok === false],
    ["accepts historical failed-executable provenance", validateScorecard(historicalAllowed).ok === true],
    ["rejects promotion-mode row in historical section", validateScorecard(historicalPromotionLeak).ok === false],
    ["rejects historical row with empty mode", validateScorecard(historicalEmptyMode).ok === false],
    ["rejects historical row with wrong column count", validateScorecard(historicalWrongColumns).ok === false],
    ["accepts historical hyphen heading variant", validateScorecard(historicalHyphenHeading).ok === true],
    ["rejects historical promotion leak with hyphen heading", validateScorecard(historicalHyphenLeak).ok === false],
    ["rejects newest fail row", validateScorecard(renderNewScorecard(failRow)).ok === false],
    ["rejects newest pending row", validateScorecard(renderNewScorecard(pendingRow)).ok === false],
  ]
  const failed = cases.filter(([, ok]) => !ok).map(([name]) => name)
  return {
    label: "scorecard:validator-self-test",
    status: failed.length ? "fail" : "pass",
    detail: failed.length ? `failed ${failed.join(", ")}` : `${cases.length} invariant checks`,
  }
}

function renderScorecardWithRow(current, row) {
  const normalizedRow = row.replace(/\s+$/u, "")
  const match = historicalHeadingMatch(current)
  if (!match) return `${current.replace(/\s+$/u, "")}\n${normalizedRow}\n`
  const prefix = current.slice(0, match.index).replace(/\s+$/u, "")
  const suffix = current.slice(match.index).replace(/^\s+/u, "")
  return `${prefix}\n${normalizedRow}\n\n${suffix}`
}

function validateScorecard(content) {
  const match = historicalHeadingMatch(content)
  const executable = match ? content.slice(0, match.index) : content
  const lines = executable.split(/\r?\n/)
  const header = "| Date | Change | Task | Agent/model | Mode | Verification signal | Result | Time/tokens | Residual risk |"
  const expectedPipes = countUnescapedPipes(header)
  const headerIdx = lines.findIndex((line) => line.trim() === header)
  if (headerIdx < 0) return { ok: false, detail: "missing executable scorecard table header" }
  const separatorIdx = lines.findIndex((line, idx) => idx > headerIdx && /^\|\s*-{3,}/.test(line.trim()))
  if (separatorIdx < 0) return { ok: false, detail: "missing executable scorecard table separator" }
  let sawRow = false
  let blankAfterRows = false
  for (const rawLine of lines.slice(separatorIdx + 1)) {
    const line = rawLine.trim()
    if (!line) {
      blankAfterRows = true
      continue
    }
    if (!line.startsWith("|")) return { ok: false, detail: `non-table line in executable rows: ${line.slice(0, 80)}` }
    if (countUnescapedPipes(line) !== expectedPipes) return { ok: false, detail: `wrong scorecard column count: ${line.slice(0, 80)}` }
    if (blankAfterRows) return { ok: false, detail: "blank line splits executable scorecard rows" }
    if (line.includes("prompt-only-historical")) return { ok: false, detail: "prompt-only historical row appears in executable table" }
    const cells = splitTableRow(line)
    const mode = cells[4]?.trim()
    const signal = cells[5]?.trim() || ""
    const result = cells[6]?.trim()
    if (!new Set(["executable", "manual-evidence"]).has(mode)) return { ok: false, detail: `unsupported scorecard mode: ${mode || "<empty>"}` }
    if (mode === "executable" && !/\bgate_mode=executable\b/.test(signal)) return { ok: false, detail: "executable scorecard row missing gate_mode=executable signal" }
    if (!new Set(["pass", "fail", "pending"]).has(result)) return { ok: false, detail: `unsupported scorecard result: ${result || "<empty>"}` }
    if (mode === "executable" && result !== "pass") return { ok: false, detail: `executable scorecard row is not pass: ${result}` }
    sawRow = true
  }
  if (!sawRow) return { ok: false, detail: "no executable scorecard rows" }
  const historical = validateHistoricalSection(content, match)
  if (!historical.ok) return historical
  return { ok: true }
}

function historicalHeadingMatch(content) {
  return /^## Historical\b.*not promotion evidence\r?$/m.exec(content)
}

function validateHistoricalSection(content, match) {
  if (!match) return { ok: true }
  const allowed = new Set(["prompt-only-historical", "failed-executable-historical"])
  const header = "| Date | Change | Task | Agent/model | Mode | Verification signal | Result | Time/tokens | Residual risk |"
  const expectedPipes = countUnescapedPipes(header)
  const lines = content.slice(match.index).split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith("|") || /^\|\s*-{3,}/.test(line) || line === header) continue
    if (countUnescapedPipes(line) !== expectedPipes) return { ok: false, detail: `wrong historical scorecard column count: ${line.slice(0, 80)}` }
    const cells = splitTableRow(line)
    const mode = cells[4]?.trim() || ""
    if (!mode) return { ok: false, detail: "historical scorecard row missing mode" }
    if (["executable", "manual-evidence"].includes(mode)) return { ok: false, detail: `promotion mode appears in historical scorecard rows: ${mode}` }
    if (mode && !allowed.has(mode)) return { ok: false, detail: `unsupported historical scorecard mode: ${mode}` }
  }
  return { ok: true }
}

function renderScorecardWithHistoricalRows(executableRow, historicalRow) {
  return `${renderNewScorecard(executableRow).trimEnd()}\n\n## Historical — prompt-only, not promotion evidence\n\nHistorical rows are provenance only.\n\n| Date | Change | Task | Agent/model | Mode | Verification signal | Result | Time/tokens | Residual risk |\n|---|---|---|---|---|---|---|---|---|\n${historicalRow.trimEnd()}\n`
}

function splitTableRow(line) {
  const cells = []
  let cell = ""
  let escaped = false
  for (let i = 1; i < line.length - 1; i += 1) {
    const ch = line[i]
    if (ch === "|" && !escaped) {
      cells.push(cell)
      cell = ""
      continue
    }
    cell += ch
    escaped = ch === "\\" && !escaped
    if (ch !== "\\") escaped = false
  }
  cells.push(cell)
  return cells
}

function countUnescapedPipes(line) {
  let count = 0
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] !== "|") continue
    let slashes = 0
    for (let j = i - 1; j >= 0 && line[j] === "\\"; j -= 1) slashes += 1
    if (slashes % 2 === 0) count += 1
  }
  return count
}

async function runShell(label, command) {
  const t0 = performance.now()
  return await new Promise((resolve) => {
    const child = spawn(command, { cwd: root, shell: true, windowsHide: true })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (chunk) => { stdout = cap(stdout + chunk) })
    child.stderr?.on("data", (chunk) => { stderr = cap(stderr + chunk) })
    child.on("error", (err) => resolve({ label, status: "pending", ms: Math.round(performance.now() - t0), stdout, stderr: String(err), detail: `not runnable: ${err.message}` }))
    child.on("close", (code) => {
      const elapsed = Math.round(performance.now() - t0)
      const output = `${stdout}\n${stderr}`
      const status = classifyShellStatus(label, code, output)
      resolve({ label, status, ms: elapsed, stdout, stderr, detail: `exit ${code} in ${elapsed} ms${status === "pass" ? "" : `; ${quote(firstLine(output))}`}` })
    })
  })
}

async function checkContinuationState() {
  const t0 = performance.now()
  const file = path.join(root, ".opencode", "run", "state.json")
  try {
    const validation = validateContinuationStateText(await fs.readFile(file, "utf8"))
    // State exists: only fail when it is present but missing/corrupt hash.
    return { label: "mission-state:continuation-hash", ms: Math.round(performance.now() - t0), status: validation.ok ? "pass" : "fail", detail: validation.detail }
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : ""
    // No state file yet: nothing to continue from; pass/skip rather than fail.
    if (code === "ENOENT") return { label: "mission-state:continuation-hash", ms: Math.round(performance.now() - t0), status: "pass", detail: "state.json not present; nothing to verify (skip)" }
    return { label: "mission-state:continuation-hash", ms: Math.round(performance.now() - t0), status: "fail", detail: `corrupt state.json: ${String(err).slice(0, 160)}` }
  }
}

function validateContinuationStateText(content) {
  try {
    const parsed = JSON.parse(content)
    const hash = parsed?.compaction?.continuation_hash
    return { ok: Boolean(hash), detail: hash ? `hash ${String(hash).slice(0, 12)}...` : "missing compaction.continuation_hash" }
  } catch (err) {
    return { ok: false, detail: `corrupt state.json: ${String(err).slice(0, 160)}` }
  }
}

async function checkContinuationFixture() {
  const t0 = performance.now()
  const good = validateContinuationStateText(JSON.stringify({ compaction: { continuation_hash: "abc123" } })).ok
  const missing = validateContinuationStateText(JSON.stringify({ compaction: {} })).ok === false
  const corrupt = validateContinuationStateText("{").ok === false
  const ok = good && missing && corrupt
  return { label: "mission-state:continuation-fixture", ms: Math.round(performance.now() - t0), status: ok ? "pass" : "fail", detail: ok ? "fixture pass/missing/corrupt cases covered" : "continuation fixture invariant failed" }
}

async function checkShimTarget(whereOutput) {
  const t0 = performance.now()
  const expected = /packages[\\/]opencode[\\/]dist-next[\\/]opencode-windows-x64[\\/]bin[\\/]opencode\.exe/i
  const files = whereOutput.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf8")
      const normalized = content.replace(/\\/g, "/")
      if (expected.test(normalized) || /bin\/vulcan\.js/i.test(normalized)) return { label: "identity:vulcan-shim", ms: Math.round(performance.now() - t0), status: "pass", detail: path.basename(file) }
    } catch {
      // Binary or unreadable PATH entry; keep checking text shims.
    }
  }
  return { label: "identity:vulcan-shim", ms: Math.round(performance.now() - t0), status: "fail", detail: "no text shim pointed at dist-next opencode.exe or bin/vulcan.js" }
}

async function checkFiles(label, files) {
  const t0 = performance.now()
  const missing = []
  for (const file of files) {
    try { await fs.access(path.join(root, file)) }
    catch { missing.push(file) }
  }
  return { label, ms: Math.round(performance.now() - t0), status: missing.length ? "fail" : "pass", detail: missing.length ? `missing ${missing.join(", ")}` : `${files.length} file(s) present` }
}

function classifyShellStatus(label, code, output) {
  if (code === 0) return "pass"
  return label === "runtime:where-vulcan" && isNotRunnableOutput(output) ? "pending" : "fail"
}

function isNotRunnableOutput(output) {
  return /not recognized|not found|could not find (any )?files|cannot find module|missing script|ENOENT/i.test(String(output))
}

async function checkNotRunnableClassifier() {
  const t0 = performance.now()
  const pendingSamples = [
    "INFO: Could not find any files for the given pattern(s).",
    "'vulcan' is not recognized as an internal or external command",
    "sh: vulcan: not found",
    "Error: Cannot find module 'missing'",
  ]
  const failSamples = [
    ["codemap:bench", "Error: Cannot find module './bug'"],
    ["config:config", "Error: config file not found in default locations"],
    ["runtime:where-vulcan", "AssertionError [ERR_ASSERTION]: 1 == 2"],
  ]
  const ok = pendingSamples.every((sample) => classifyShellStatus("runtime:where-vulcan", 1, sample) === "pending")
    && failSamples.every(([label, sample]) => classifyShellStatus(label, 1, sample) === "fail")
  return { label: "runtime:not-runnable-classifier", ms: Math.round(performance.now() - t0), status: ok ? "pass" : "fail", detail: ok ? `${pendingSamples.length} unavailable-runtime and ${failSamples.length} real-failure samples classified correctly` : "not-runnable classifier boundary failed" }
}

async function checkSourceContains(label, file, needles) {
  const t0 = performance.now()
  try {
    const content = await fs.readFile(path.join(root, file), "utf8")
    const missing = needles.filter((needle) => !content.includes(needle))
    return { label, ms: Math.round(performance.now() - t0), status: missing.length ? "fail" : "pass", detail: missing.length ? `missing ${missing.map(quote).join(", ")} in ${file}` : `${file} contains ${needles.length} guardrail marker(s)` }
  } catch (err) {
    return { label, ms: Math.round(performance.now() - t0), status: "fail", detail: `cannot read ${file}: ${String(err).slice(0, 160)}` }
  }
}

async function checkRecallBusPortableRoot() {
  const t0 = performance.now()
  const file = "tools/recall_bus.ts"
  try {
    const content = await fs.readFile(path.join(root, file), "utf8")
    const ok = content.includes("os.homedir()") && !PRIVATE_ABSOLUTE_PATH.test(content)
    return { label: "recall-bus:portable-root", ms: Math.round(performance.now() - t0), status: ok ? "pass" : "fail", detail: ok ? "default setup root is homedir-based" : "recall_bus default root is not portable" }
  } catch (err) {
    return { label: "recall-bus:portable-root", ms: Math.round(performance.now() - t0), status: "fail", detail: `cannot read ${file}: ${String(err).slice(0, 160)}` }
  }
}

async function checkRecallBusSpecSource() {
  const t0 = performance.now()
  const file = "tools/recall_bus.ts"
  try {
    const content = await fs.readFile(path.join(root, file), "utf8")
    const ok = content.includes("fs.readdir(dir)") && content.includes("VULCANCODE_") && !content.includes("VULCANCODE_RND_2026-06-27.md")
    return { label: "recall-bus:spec-source", ms: Math.round(performance.now() - t0), status: ok ? "pass" : "fail", detail: ok ? "spec source enumerates VULCANCODE_*.md instead of one dated file" : "recall_bus spec source is still single-file or missing" }
  } catch (err) {
    return { label: "recall-bus:spec-source", ms: Math.round(performance.now() - t0), status: "fail", detail: `cannot read ${file}: ${String(err).slice(0, 160)}` }
  }
}

async function checkHelperToolsNoPrivatePaths() {
  const t0 = performance.now()
  const hits = []
  for (const file of HELPER_TOOLS) {
    try {
      const content = await fs.readFile(path.join(root, file), "utf8")
      if (PRIVATE_ABSOLUTE_PATH.test(content)) hits.push(file)
    } catch {
      // Missing files are reported by helper-tools; avoid duplicating that detail.
    }
  }
  return { label: "helper-tools:no-private-paths", ms: Math.round(performance.now() - t0), status: hits.length ? "fail" : "pass", detail: hits.length ? `private absolute path marker in ${hits.join(", ")}` : `${HELPER_TOOLS.length} helper file(s) free of private absolute path markers` }
}

function validateMetricsJsonl(content) {
  const lines = String(content).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return { ok: false, detail: "no metrics rows" }
  for (const [idx, line] of lines.entries()) {
    let parsed
    try { parsed = JSON.parse(line) }
    catch { return { ok: false, detail: `line ${idx + 1} is not JSON` } }
    if (Number.isNaN(Date.parse(String(parsed.ts || "")))) return { ok: false, detail: `line ${idx + 1} has invalid ts` }
    if (typeof parsed.event !== "string" || !parsed.event) return { ok: false, detail: `line ${idx + 1} has invalid event` }
    if (!Number.isInteger(parsed.event_count) || parsed.event_count < 1) return { ok: false, detail: `line ${idx + 1} has invalid event_count` }
    if (!/^[a-f0-9]{16}$/i.test(String(parsed.args_hash || ""))) return { ok: false, detail: `line ${idx + 1} has invalid args_hash` }
  }
  return { ok: true, detail: `${lines.length} metrics row(s) valid` }
}

async function checkMetricsTapJsonlFixture() {
  const t0 = performance.now()
  const good = `${JSON.stringify({ ts: "2026-01-01T00:00:00.000Z", event: "tool.execute", event_count: 1, args_hash: "0123456789abcdef" })}\n`
  const badHash = `${JSON.stringify({ ts: "2026-01-01T00:00:00.000Z", event: "tool.execute", event_count: 1, args_hash: "not-a-hash" })}\n`
  const badJson = "{\n"
  const ok = validateMetricsJsonl(good).ok && !validateMetricsJsonl(badHash).ok && !validateMetricsJsonl(badJson).ok
  return { label: "metrics-tap:jsonl-fixture", ms: Math.round(performance.now() - t0), status: ok ? "pass" : "fail", detail: ok ? "fixture valid/bad-hash/bad-json cases covered" : "metrics JSONL fixture invariant failed" }
}

async function checkMetricsTapAmbient() {
  const t0 = performance.now()
  const file = path.join(root, ".opencode", "run", "metrics.jsonl")
  try {
    const lines = (await fs.readFile(file, "utf8")).split(/\r?\n/).filter(Boolean).slice(-20).join(os.EOL)
    const validation = validateMetricsJsonl(lines)
    return { label: "metrics-tap:ambient-jsonl", ms: Math.round(performance.now() - t0), status: validation.ok ? "pass" : "fail", detail: validation.detail }
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : ""
    if (code === "ENOENT") return { label: "metrics-tap:ambient-jsonl", ms: Math.round(performance.now() - t0), status: "pass", detail: "metrics.jsonl not present; fixture validator covered schema" }
    return { label: "metrics-tap:ambient-jsonl", ms: Math.round(performance.now() - t0), status: "fail", detail: `cannot read metrics.jsonl: ${String(err).slice(0, 160)}` }
  }
}

function checkTaskCoverage(files, completedChecks) {
  const labels = new Map(completedChecks.map((check) => [check.label, check.status]))
  const unbound = []
  const missing = []
  const failed = []
  const pending = []
  for (const file of files) {
    const bindings = TASK_BINDINGS[file] || []
    if (!bindings.length) {
      unbound.push(file)
      continue
    }
    for (const label of bindings) {
      const status = labels.get(label)
      if (!status) missing.push(`${file}->${label}`)
      else if (status === "fail") failed.push(`${file}->${label}`)
      else if (status === "pending") pending.push(`${file}->${label}`)
    }
  }
  const status = failed.length ? "fail" : unbound.length || missing.length || pending.length ? "pending" : "pass"
  const detail = failed.length ? `failed bindings: ${failed.join(", ")}`
    : unbound.length ? `unbound task(s): ${unbound.join(", ")}`
      : missing.length ? `missing binding label(s): ${missing.join(", ")}`
        : pending.length ? `pending binding(s): ${pending.join(", ")}`
          : `${files.length} task(s) bound to deterministic executable checks`
  return { label: "task-coverage", ms: 0, status, detail }
}

function cap(value) {
  return String(value).slice(-8000)
}

function firstLine(value) {
  return String(value).trim().split(/\r?\n/).find(Boolean) || "no output"
}

function quote(value) {
  return JSON.stringify(String(value).slice(0, 180))
}

function escapeCell(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ")
}
