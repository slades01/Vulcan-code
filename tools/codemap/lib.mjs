// VulcanCode Code Memory — deterministic local code-graph (ECL) engine.
//
// Extract -> Cognify -> Load into a precomputed code overlay so structural recall
// (file/symbol/edge lookup) is a cheap graph query instead of rebuilding
// cartography every task.
//
// Pure Node ESM. Only built-in modules (node:fs, node:path, node:crypto,
// node:perf_hooks, node:child_process). No hard external dependencies.
// Deterministic output ordering.
//
// Richer parsers are OPTIONAL and discovered at runtime (never hard-required):
//   - If a trusted engine-local `typescript` install resolves, the JS/TS family
//     is parsed into a real AST (functions, classes, methods, accessors,
//     constructors, interfaces, type aliases, enums, namespaces, imports incl.
//     side-effect/re-export, variable bindings, and call expressions) with
//     accurate start/end line spans.
//   - Python AST parsing is opt-in only: set VULCAN_CODE_MEMORY_PYTHON to an
//     absolute trusted Python 3 binary. Otherwise Python source uses the rich
//     indentation-aware text fallback.
// Any failure (module missing, parse/syntax error, spawn error, non-zero exit,
// malformed JSON) silently falls back to the regex extractors, so the engine
// degrades gracefully. Parsers run ONLY after the secret scan, on already-read
// content, inside the validated root/out guards.
// Secret-safe: credential-like paths are excluded from scanning and file content
// is scanned before any snippet/doc/signature is persisted; suspected secrets
// are redacted and never written.
//
// Public API:
//   generateCodemap({ root, out, limit })
//   recallCodemap({ root, out, query, limit })
//   healthCodemap({ root, out, staleThreshold })
//   benchCodemap({ root, out, query, limit })
//
// Every function returns a plain object with { ok, markdown, ... } (and never
// throws for ordinary failures). Markdown is pre-rendered for the CLI wrappers
// and the plugin tools; raw data fields ride alongside.

import { promises as fsp } from "node:fs"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { performance } from "node:perf_hooks"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"

const requireFromHere = createRequire(import.meta.url)
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url))

const GENERATOR = "vulcan-codemap"
const MANIFEST_VERSION = "1"

const SCANNED_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".md",
  ".json", ".jsonc", ".yml", ".yaml",
])

// Directories never descended into.
const EXCLUDED_DIR_NAMES = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".cache", "logs",
  ".ssh", ".aws", ".azure", ".kube", ".gnupg",
])

// Substrings in a posix rel path that mark credential/private tree regions.
const EXCLUDED_PATH_SEGMENTS = [
  ".opencode/codemap", // never scan our own output
  "Google/Chrome/User Data",
  "Microsoft/Edge/User Data",
  "Mozilla/Firefox/Profiles",
]

// High-signal secret patterns. Order matters only for the returned reason.
// These are deliberately specific (length/class-gated) so documentation that
// merely *mentions* "sk-..." / "AKIA..." / "Bearer ..." does not trip them.
const SECRET_PATTERNS = [
  ["aws_access_key", /AKIA[0-9A-Z]{16}/],
  ["google_api_key", /AIza[0-9A-Za-z_\-]{35}/],
  ["github_pat", /ghp_[A-Za-z0-9]{36,}/],
  ["github_fine_grained", /github_pat_[A-Za-z0-9_]{22,}/],
  ["npm_token", /npm_[A-Za-z0-9]{36,}/],
  ["npm_auth_token", /_authToken\s*=\s*([A-Za-z0-9_\-]{20,})/i],
  ["jwt", /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["url_credentials", /[a-z][a-z0-9+.-]*:\/\/[^:\s/@]+:([^@\s/]{8,})@/i],
  ["azure_sas_sig", /[?&]sig=([A-Za-z0-9%+/_-]{20,})/i],
  ["slack_token", /xox[baprs]-[0-9A-Za-z\-]{10,}/],
  ["stripe_key", /sk_(live|test)_[0-9A-Za-z]{20,}/],
  ["openai_sk", /sk-[A-Za-z0-9_\-]{20,}/],
  // Length-floored: a real bearer/JWT token is long; bare "Bearer ..." in docs is not.
  ["bearer_token", /Bearer\s+[A-Za-z0-9\-._~+/]{16,}={0,2}/],
  [
    "private_key_block",
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/,
  ],
  // Obvious secret assignment. Capture group 1 = the value, so placeholder
  // values like {env:NAME} / ${NAME} / <NAME> / EXAMPLE... can be exempted.
  [
    "assignment",
    /(?:api[_-]?key|apikey|secret|access[_-]?token|auth[_-]?token|passwd|password|client[_-]?secret|private[_-]?key)\s*[:=]\s*["']([^"'\s]{8,})["']/i,
  ],
  [
    "generic_secret_assignment",
    /(?:database_url|db_url|connection[_-]?string|credential|credentials|token|secret|password|passwd|api[_-]?key|auth)\s*[:=]\s*["']?([^"'\s#]{16,})["']?/i,
  ],
]

const STOP_NAMES = new Set([
  "main", "test", "tests", "run", "init", "start", "stop", "get", "set", "add",
  "new", "use", "log", "data", "value", "item", "name", "type", "self", "this",
  "foo", "bar", "baz", "config", "options", "props", "state", "result", "build",
])

// --- small helpers ---------------------------------------------------------

function toPosix(p) {
  return String(p).split(path.sep).join("/")
}

function extOf(name) {
  const i = name.lastIndexOf(".")
  return i === -1 ? "" : name.slice(i).toLowerCase()
}

function sha256hex(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex")
}

// Reproducible content fingerprint: strip the volatile capturedAt (wall-clock set
// once per run) so two runs over identical content yield identical digests. The
// stored nodes.jsonl/edges.jsonl retain real capturedAt provenance; this only
// affects manifest.digests so integrity checks are content-stable.
function canonicalLine(obj) {
  const copy = Object.assign({}, obj)
  delete copy.capturedAt
  return JSON.stringify(copy)
}

function round(n) {
  return Math.round(Number(n) || 0)
}

function nowIso() {
  return new Date().toISOString()
}

function normPath(p) {
  return path.resolve(String(p || ""))
}

function normCmp(p) {
  return normPath(p).toLowerCase()
}

function sameOrInside(child, parent) {
  const c = normCmp(child)
  const p = normCmp(parent)
  return c === p || c.startsWith(p + path.sep.toLowerCase())
}

function homeDir() {
  return process.env.USERPROFILE || process.env.HOME || ""
}

function validateRoot(root) {
  const resolved = normPath(root)
  const parsed = path.parse(resolved)
  if (resolved === parsed.root) throw new Error("refusing to scan filesystem root: " + resolved)
  const home = homeDir()
  if (home && normCmp(resolved) === normCmp(home)) throw new Error("refusing to scan user home as a project root: " + resolved)
  const lower = toPosix(resolved).toLowerCase()
  const dangerousSegments = ["/.ssh", "/.aws", "/.azure", "/.kube", "/.gnupg", "/.config/opencode", "/google/chrome/user data", "/microsoft/edge/user data", "/mozilla/firefox/profiles"]
  if (dangerousSegments.some((seg) => lower.endsWith(seg) || lower.includes(seg + "/"))) {
    throw new Error("refusing to scan credential/browser/config directory as project root: " + resolved)
  }
  let st
  try {
    st = fs.statSync(resolved)
  } catch {
    throw new Error("project root does not exist: " + resolved)
  }
  if (!st.isDirectory()) throw new Error("project root is not a directory: " + resolved)
  return resolved
}

function resolveOut(root, outOpt) {
  const base = path.resolve(root, ".opencode", "codemap")
  const out = path.resolve(String(outOpt || base))
  if (!sameOrInside(out, base)) {
    throw new Error("refusing codemap output outside <root>/.opencode/codemap: " + out)
  }
  return out
}

function isPlaceholderValue(v) {
  return (
    /^\{?env:/i.test(v) ||
    /^\$\{/i.test(v) ||
    /^</.test(v) ||
    /\$\{|env:/i.test(v) ||
    /^(EXAMPLE|YOUR|REPLACE|XXXX|PLACEHOLDER)/i.test(v)
  )
}

// Scan file content for high-signal secret material. Returns a reason string or null.
function scanSecrets(content) {
  if (!content) return null
  for (const [name, re] of SECRET_PATTERNS) {
    const m = content.match(re)
    if (!m) continue
    if (m[1]) {
      const val = m[1] || ""
      if (isPlaceholderValue(val)) continue
    }
    return name
  }
  return null
}

function isExcludedRel(rel) {
  const lower = rel.toLowerCase()
  for (const seg of EXCLUDED_PATH_SEGMENTS) {
    if (lower === seg || lower.startsWith(seg + "/")) return true
  }
  return false
}

function isExcludedFile(name, rel) {
  if (isExcludedRel(rel)) return true
  const lower = name.toLowerCase()
  if (/^\.env(\..*)?$/i.test(name)) return true
  if (/\.(pem|key|p12|pfx)$/i.test(name)) return true
  if (/zip$/i.test(name)) return true
  // credential-like name tokens (case-insensitive substring).
  if (/(^|[._\-])token([._\-]|$)/i.test(lower)) return true
  if (/(^|[._\-])secret([._\-]|$)/i.test(lower)) return true
  if (/(^|[._\-])credentials?([._\-]|$)/i.test(lower)) return true
  return false
}

function isExcludedDir(name, rel) {
  if (EXCLUDED_DIR_NAMES.has(name)) return true
  return isExcludedRel(rel)
}

// Deterministic recursive scan. Results are pushed in sorted (stable) order.
async function walk(dir, root, acc, limit) {
  if (acc.length >= limit) return
  let entries
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const e of entries) {
    if (acc.length >= limit) return
    const abs = path.join(dir, e.name)
    const rel = toPosix(path.relative(root, abs))
    if (e.isDirectory()) {
      if (isExcludedDir(e.name, rel)) continue
      await walk(abs, root, acc, limit)
    } else if (e.isFile()) {
      if (!SCANNED_EXTS.has(extOf(e.name))) continue
      if (isExcludedFile(e.name, rel)) continue
      acc.push({ abs, rel, name: e.name })
    }
  }
}

async function atomicWrite(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true })
  const tmp = filePath + "." + process.pid + ".tmp"
  await fsp.writeFile(tmp, data, "utf8")
  // rename over the target (atomic on same volume; best-effort across OSes).
  try {
    await fsp.rename(tmp, filePath)
  } catch (err) {
    try {
      await fsp.unlink(tmp)
    } catch {
      /* ignore */
    }
    throw err
  }
}

async function readJsonIfExists(filePath) {
  try {
    const txt = await fsp.readFile(filePath, "utf8")
    return JSON.parse(txt)
  } catch {
    return null
  }
}

async function readJsonl(filePath) {
  let txt = ""
  try {
    txt = await fsp.readFile(filePath, "utf8")
  } catch {
    return []
  }
  const out = []
  for (const line of txt.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    try {
      out.push(JSON.parse(t))
    } catch {
      /* skip malformed line */
    }
  }
  return out
}

function provenance(root, rel, sourceHash, mtimeMs, capturedAt) {
  return {
    repoRoot: root,
    path: rel,
    sourceHash,
    mtimeMs,
    capturedAt,
    capturedBy: GENERATOR,
    status: "fresh",
  }
}

function mdInline(s) {
  return String(s == null ? "" : s).replace(/`/g, "'")
}

function kindRank(kind) {
  if (kind === "project") return 0
  if (kind === "file") return 1
  return 2
}

function byNode(a, b) {
  const r = kindRank(a.kind) - kindRank(b.kind)
  if (r !== 0) return r
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function byEdge(a, b) {
  if (a.from !== b.from) return a.from < b.from ? -1 : 1
  if (a.type !== b.type) return a.type < b.type ? -1 : 1
  const ta = a.to || a.targetRef || ""
  const tb = b.to || b.targetRef || ""
  return ta < tb ? -1 : ta > tb ? 1 : 0
}

// --- extraction ------------------------------------------------------------

// Resolve an import specifier to a scanned relPath, or null if unresolved.
function resolveImport(spec, importerRel, relSet) {
  if (!spec) return null
  // Relative specifiers resolve against the importing file's directory.
  if (spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..") {
    const baseDir = path.posix.dirname(importerRel)
    let target = path.posix.normalize(path.posix.join(baseDir, spec))
    if (relSet.has(target)) return target
    // Try the scanned extensions if the spec has none.
    if (!extOf(spec)) {
      for (const ext of SCANNED_EXTS) {
        const withExt = target + ext
        if (relSet.has(withExt)) return withExt
      }
      // index file under a directory.
      for (const ext of SCANNED_EXTS) {
        const idx = path.posix.join(target, "index" + ext)
        if (relSet.has(idx)) return idx
      }
    }
    return null
  }
  // Bare specifiers (react, fs, @scope/pkg) are unresolved at v1.
  return null
}

// --- optional richer parsers (TS compiler API + Python ast) ---------------
//
// Both are OPTIONAL and discovered once per process (cached). See the file
// header for the full degradation contract. initParsers() is awaited inside
// generateCodemap; the results are threaded into extractByExt/processFile.

let _tsCache = undefined // undefined = uninitialized, null = unavailable, object = module
let _tsVersion = null
let _pyCache = undefined // undefined = uninitialized, null = unavailable, { cmd, args } = probe

async function initParsers() {
  if (_tsCache === undefined) {
    try {
      const tsPath = requireFromHere.resolve("typescript")
      const nm = path.sep + "node_modules" + path.sep + "typescript" + path.sep
      const normalizedTs = path.resolve(tsPath)
      const trusted = normalizedTs.includes(nm) && sameOrInside(normalizedTs, path.resolve(MODULE_DIR, "..", ".."))
      if (!trusted) throw new Error("untrusted TypeScript parser path: " + normalizedTs)
      const mod = await import(pathToFileURL(normalizedTs).href)
      const t = mod && (mod.default || mod)
      if (t && typeof t.createSourceFile === "function" && t.SyntaxKind && typeof t.forEachChild === "function") {
        _tsCache = t
        _tsVersion = t.version || null
      } else {
        _tsCache = null
      }
    } catch {
      _tsCache = null
    }
  }
  if (_pyCache === undefined) _pyCache = probePython()
  return { ts: _tsCache, tsVersion: _tsVersion, py: _pyCache }
}

// Probe for a usable Python 3 binary. For security, this never searches PATH by
// default: set VULCAN_CODE_MEMORY_PYTHON to an absolute trusted Python 3 binary
// to enable Python AST parsing. Otherwise `.py` files use the rich text fallback.
function probePython() {
  const configured = process.env.VULCAN_CODE_MEMORY_PYTHON
  if (!configured || !path.isAbsolute(configured)) return null
  const cmd = path.resolve(configured)
  if (!fs.existsSync(cmd)) return null
  const candidates = [[cmd, []]]
  for (const [candidate, pre] of candidates) {
    let r
    try {
      r = spawnSync(candidate, pre.concat(["--version"]), {
        encoding: "utf8",
        timeout: 4000,
        windowsHide: true,
        env: {},
      })
    } catch {
      continue
    }
    if (!r || r.error) continue
    const combined = String(r.stdout || "") + String(r.stderr || "")
    if (r.status === 0 && /Python\s+3/.test(combined)) {
      return { cmd: candidate, args: pre }
    }
  }
  return null
}

// Minimal `ast`-based Python extractor. Reads JSON { content } from stdin and
// writes JSON { ok, out: { symbols, imports, calls } } to stdout. Methods are
// detected by parent (FunctionDef whose direct container is a ClassDef). Only
// direct Name calls are recorded (Attribute/method calls are dropped to keep the
// local call graph high-precision, matching the JS extractor). A per-file
// SyntaxError yields { ok: false, error: "syntax" } so the caller can fall back
// to the regex extractor for that one file without failing the run.
const PYTHON_AST_SCRIPT = [
  "import ast, json, sys",
  "def _name_of(node):",
  "    f = node.func",
  "    if isinstance(f, ast.Name): return f.id",
  "    return None",
  "def _visit(node, container, out):",
  "    for child in ast.iter_child_nodes(node):",
  "        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):",
  "            kind = 'method' if isinstance(container, ast.ClassDef) else 'function'",
  "            out['symbols'].append({'name': child.name, 'kind': kind,",
  "                'async': isinstance(child, ast.AsyncFunctionDef),",
  "                'startLine': child.lineno,",
  "                'endLine': getattr(child, 'end_lineno', None) or child.lineno,",
  "                'doc': ast.get_docstring(child)})",
  "            _visit(child, child, out)",
  "        elif isinstance(child, ast.ClassDef):",
  "            out['symbols'].append({'name': child.name, 'kind': 'class',",
  "                'startLine': child.lineno,",
  "                'endLine': getattr(child, 'end_lineno', None) or child.lineno,",
  "                'doc': ast.get_docstring(child)})",
  "            _visit(child, child, out)",
  "        elif isinstance(child, ast.Import):",
  "            for n in child.names:",
  "                out['imports'].append({'spec': n.name, 'line': child.lineno})",
  "            _visit(child, container, out)",
  "        elif isinstance(child, ast.ImportFrom):",
  "            out['imports'].append({'spec': child.module or '', 'line': child.lineno})",
  "            _visit(child, container, out)",
  "        elif isinstance(child, ast.Call):",
  "            nm = _name_of(child)",
  "            if nm: out['calls'].append({'name': nm, 'line': child.lineno})",
  "            _visit(child, container, out)",
  "        else:",
  "            _visit(child, container, out)",
  "def main():",
  "    data = sys.stdin.buffer.read()",
  "    try: payload = json.loads(data)",
  "    except Exception: json.dump({'ok': False, 'error': 'bad-input'}, sys.stdout); return",
  "    src = payload.get('content', '')",
  "    # Tolerate a leading UTF-8 BOM (common on Windows-written files);",
  "    # ast.parse rejects a U+FEFF char at the start of a str.",
  "    if src and src[0] == '\\ufeff': src = src[1:]",
  "    out = {'symbols': [], 'imports': [], 'calls': []}",
  "    try: tree = ast.parse(src)",
  "    except SyntaxError as e: json.dump({'ok': False, 'error': 'syntax', 'message': str(e)}, sys.stdout); return",
  "    except Exception as e: json.dump({'ok': False, 'error': 'other', 'message': str(e)}, sys.stdout); return",
  "    _visit(tree, None, out)",
  "    json.dump({'ok': True, 'out': out}, sys.stdout)",
  "main()",
].join("\n")

// Returns { raw, imports, callsites } on success, or null to signal regex
// fallback. Signatures are the source line at the symbol's startLine (Python
// `ast` does not expose a normalized signature; the declaration line is a good
// approximation and recall truncates it anyway).
function extractPythonAst(content, lines, py) {
  if (!py || !content) return null
  let r
  try {
    r = spawnSync(py.cmd, py.args.concat(["-c", PYTHON_AST_SCRIPT]), {
      input: JSON.stringify({ content }),
      encoding: "utf8",
      timeout: 20000,
      windowsHide: true,
      maxBuffer: 32 * 1024 * 1024,
      env: {},
    })
  } catch {
    return null
  }
  if (!r || r.error || r.status !== 0) return null
  let parsed
  try {
    parsed = JSON.parse(r.stdout)
  } catch {
    return null
  }
  if (!parsed || parsed.ok !== true || !parsed.out) return null
  const o = parsed.out
  const raw = (o.symbols || []).map((s) => {
    const startLine = Number(s.startLine) || 1
    const endLine = Number(s.endLine) || startLine
    const lineText = lines[startLine - 1] ? lines[startLine - 1].trim() : null
    const kind = s.kind === "class" ? "class" : s.kind === "method" ? "method" : "function"
    return {
      name: String(s.name || ""),
      kind,
      signature: lineText,
      doc: s.doc || null,
      startLine,
      endLine,
      endLineKnown: true,
    }
  })
  const imports = (o.imports || []).map((im) => ({ spec: String(im.spec || ""), line: Number(im.line) || 1 }))
  const callsites = (o.calls || []).map((c) => ({ name: String(c.name || ""), line: Number(c.line) || 1 }))
  return { raw, imports, callsites }
}

// Richer Python text extractor used only when the `ast` subprocess is
// unavailable. Indentation-aware method detection + async awareness + a cheap
// docstring/comment-above heuristic. Still best-effort (no real spans); AST is
// preferred whenever a Python binary is reachable.
function extractPythonRich(lines, raw, imports, callsites) {
  const classStack = [] // { indent }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const fdef = line.match(/^(\s*)(async\s+)?def\s+([A-Za-z_][\w]*)\s*\(/)
    if (fdef) {
      const indent = fdef[1].replace(/\t/g, "    ").length
      while (classStack.length && indent <= classStack[classStack.length - 1].indent) classStack.pop()
      raw.push({
        name: fdef[3],
        kind: classStack.length ? "method" : "function",
        signature: line.trim(),
        doc: pythonDocAbove(lines, i),
        startLine: i + 1,
        endLine: i + 1,
      })
      continue
    }
    const cdef = line.match(/^(\s*)class\s+([A-Za-z_][\w]*)/)
    if (cdef) {
      const indent = cdef[1].replace(/\t/g, "    ").length
      while (classStack.length && indent <= classStack[classStack.length - 1].indent) classStack.pop()
      classStack.push({ indent })
      raw.push({ name: cdef[2], kind: "class", signature: line.trim(), doc: pythonDocAbove(lines, i), startLine: i + 1, endLine: i + 1 })
      continue
    }
    const from = line.match(/^\s*from\s+([\w.]+)\s+import\b/)
    if (from) {
      imports.push({ spec: from[1], line: i + 1 })
      continue
    }
    const imp = line.match(/^\s*import\s+([\w.]+)/)
    if (imp) {
      imports.push({ spec: imp[1], line: i + 1 })
      continue
    }
    const callRe = /\b([A-Za-z_][\w]*)\s*\(/g
    let cm
    while ((cm = callRe.exec(line)) !== null) callsites.push({ name: cm[1], line: i + 1 })
  }
}

function pythonDocAbove(lines, idx) {
  for (let j = idx - 1; j >= 0; j--) {
    const t = lines[j].trim()
    if (!t) break
    if (t.startsWith("#")) return t.replace(/^#+\s*/, "").slice(0, 200) || null
    break
  }
  return null
}

// --- TypeScript compiler API extractor -------------------------------------

function scriptKindOf(ts, ext) {
  if (ext === ".tsx") return ts.ScriptKind.TSX
  if (ext === ".ts") return ts.ScriptKind.TS
  if (ext === ".jsx") return ts.ScriptKind.JSX
  return ts.ScriptKind.JS
}

function hasExportModifier(ts, node) {
  const mods = node.modifiers
  if (!mods || !mods.length) return false
  return mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
}

// Best-effort leading JSDoc/line comment immediately preceding a node.
function tsLeadingDoc(ts, content, node) {
  try {
    const fullStart = node.getFullStart()
    const ranges = ts.getLeadingCommentRanges(content, fullStart)
    if (!ranges || !ranges.length) return null
    const last = ranges[ranges.length - 1]
    let text = content.slice(last.pos, last.end)
    text = text.replace(/^\/\*\*?/, "").replace(/\*+\/$/, "")
    text = text.replace(/^\s*\* ?/gm, "").trim()
    if (!text) return null
    const firstLine = text.split(/\r?\n/)[0].trim()
    return firstLine ? firstLine.slice(0, 200) : null
  } catch {
    return null
  }
}

// Declaration head as a compact signature: source from node start to the body
// (function-like) or first member (class/interface/enum), whitespace-collapsed.
// Falls back to the start source line for nodes without a clear body boundary
// (type aliases, variable bindings).
function tsSigOf(ts, sf, node, content, lines) {
  try {
    const start = node.getStart(sf)
    let end = -1
    if (node.body && typeof node.body.getStart === "function") {
      end = node.body.getStart(sf)
    } else if (node.members && node.members.length && typeof node.members[0].getStart === "function") {
      end = node.members[0].getStart(sf)
    }
    if (end > start) {
      const text = content.slice(start, end).replace(/\s+/g, " ").replace(/[,{;=]\s*$/, "").trim()
      if (text) return text
    }
  } catch {
    /* fall through to start-line */
  }
  try {
    const ln = ts.getLineAndCharacterOfPosition(sf, node.getStart(sf)).line
    const t = (lines[ln] || "").trim()
    return t || null
  } catch {
    return null
  }
}

function memberName(ts, sf, m) {
  const name = m.name
  if (!name) return m.kind === ts.SyntaxKind.Constructor ? "constructor" : null
  if (ts.isIdentifier(name)) return name.text
  try {
    return name.getText(sf) || null
  } catch {
    return null
  }
}

function moduleNameText(name) {
  if (!name) return null
  return name.text != null ? name.text : null
}

// Parse the JS/TS family via the TypeScript compiler API. Returns
// { raw, imports, callsites } on success, or null to signal regex fallback.
// createSourceFile is a pure parse (no typecheck/Program); it yields a usable
// tree even on imperfect code, so we do not gate on diagnostics (fetching those
// would require a heavyweight Program). Only direct Identifier callees are
// recorded as callsites to keep the local call graph high-precision.
function extractJsAst(content, lines, ext, ts) {
  let sf
  try {
    sf = ts.createSourceFile("input" + ext, content, ts.ScriptTarget.Latest, true, scriptKindOf(ts, ext))
  } catch {
    return null
  }
  if (!sf) return null

  const imports = []
  const callsites = []
  const raw = []
  const posLine = (pos) => ts.getLineAndCharacterOfPosition(sf, pos).line + 1

  const pushSym = (node, name, kind) => {
    if (!name) return
    raw.push({
      name,
      kind,
      signature: tsSigOf(ts, sf, node, content, lines),
      doc: tsLeadingDoc(ts, content, node),
      startLine: posLine(node.getStart(sf)),
      endLine: posLine(node.end),
      endLineKnown: true,
    })
  }

  const visit = (node) => {
    if (ts.isFunctionDeclaration(node)) {
      pushSym(node, node.name ? node.name.text : null, "function")
    } else if (ts.isClassDeclaration(node)) {
      if (node.name) pushSym(node, node.name.text, "class")
    } else if (ts.isMethodDeclaration(node)) {
      pushSym(node, memberName(ts, sf, node), "method")
    } else if (ts.isConstructorDeclaration(node)) {
      pushSym(node, "constructor", "method")
    } else if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
      pushSym(node, memberName(ts, sf, node), "accessor")
    } else if (ts.isInterfaceDeclaration(node)) {
      if (node.name) pushSym(node, node.name.text, "interface")
    } else if (ts.isTypeAliasDeclaration(node)) {
      if (node.name) pushSym(node, node.name.text, "type")
    } else if (ts.isEnumDeclaration(node)) {
      if (node.name) pushSym(node, node.name.text, "enum")
    } else if (ts.isModuleDeclaration(node)) {
      if (node.name) pushSym(node, moduleNameText(node.name), "namespace")
    } else if (ts.isVariableStatement(node)) {
      const exported = hasExportModifier(ts, node)
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue
        const init = decl.initializer
        let kind
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
          kind = "function"
        } else if (exported) {
          kind = "export"
        } else {
          kind = "const"
        }
        pushSym(decl, decl.name.text, kind)
      }
    }

    // imports (incl. side-effect `import "./x"` and re-export `export ... from`)
    if (ts.isImportDeclaration(node)) {
      const spec = node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier.text : null
      if (spec) imports.push({ spec, line: posLine(node.getStart(sf)) })
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const spec = ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier.text : null
      if (spec) imports.push({ spec, line: posLine(node.getStart(sf)) })
    }

    // call sites: direct identifier callees only
    if (ts.isCallExpression(node)) {
      const callee = node.expression
      if (callee && ts.isIdentifier(callee)) {
        callsites.push({ name: callee.text, line: posLine(callee.getStart(sf)) })
      }
    }

    ts.forEachChild(node, visit)
  }
  visit(sf)
  return { raw, imports, callsites }
}

// JS/TS family regex extractor (fallback when the TS compiler API is absent or
// the source failed to parse). Operates on the provided accumulators.
function extractJsRegex(lines, raw, imports, callsites) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // imports
    const im1 = line.match(/^\s*import\s+(?:type\s+)?(?:[\w$]+(?:\s*,\s*\{[^}]*\})?|\*\s+as\s+[\w$]+|\{[^}]*\})\s+from\s*["']([^"']+)["']/)
    const im2 = !im1 && line.match(/^\s*import\s+(?:type\s+)?["']([^"']+)["']/)
    const im3 = !im1 && !im2 && line.match(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/)
    const im = im1 || im2 || im3
    if (im) imports.push({ spec: im[1], line: i + 1 })
    // export named
    const ex = line.match(/^\s*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/)
    if (ex) raw.push({ name: ex[1], kind: "export", signature: line.trim(), doc: null, startLine: i + 1, endLine: i + 1 })
    // function declarations
    const fn = line.match(/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/)
    if (fn) raw.push({ name: fn[1], kind: "function", signature: line.trim(), doc: null, startLine: i + 1, endLine: i + 1 })
    // class declarations
    const cls = line.match(/^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/)
    if (cls) raw.push({ name: cls[1], kind: "class", signature: line.trim(), doc: null, startLine: i + 1, endLine: i + 1 })
    // arrow / const fn assignments
    const ar = line.match(/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(?[^=]*\)?\s*=>/)
    if (ar) raw.push({ name: ar[1], kind: "function", signature: line.trim(), doc: null, startLine: i + 1, endLine: i + 1 })
    // call sites
    const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g
    let cm
    while ((cm = callRe.exec(line)) !== null) callsites.push({ name: cm[1], line: i + 1 })
  }
}

// Per-language symbol/heading/key extraction. Returns { raw, imports, callsites, extractor }.
// `raw` = array of { name, kind, signature, doc, startLine, endLine }.
// `extractor` records which path produced the symbols (for manifest parser info).
function extractByExt(name, content, lines, ext, parsers) {
  const imports = []
  const callsites = [] // { name, line }
  const raw = []
  let extractor = "text"
  if (!content) return { raw, imports, callsites, extractor }

  const pushSym = (sym) => raw.push(sym)

  const isJs = ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx" || ext === ".mjs" || ext === ".cjs"

  if (isJs) {
    let usedAst = false
    if (parsers && parsers.ts) {
      const ast = extractJsAst(content, lines, ext, parsers.ts)
      if (ast) {
        for (const s of ast.raw) raw.push(s)
        for (const im of ast.imports) imports.push(im)
        for (const c of ast.callsites) callsites.push(c)
        usedAst = true
      }
    }
    if (usedAst) {
      extractor = "js-ast"
    } else {
      extractor = "js-regex"
      extractJsRegex(lines, raw, imports, callsites)
    }
  } else if (ext === ".py") {
    let usedAst = false
    if (parsers && parsers.py) {
      const ast = extractPythonAst(content, lines, parsers.py)
      if (ast) {
        for (const s of ast.raw) raw.push(s)
        for (const im of ast.imports) imports.push(im)
        for (const c of ast.callsites) callsites.push(c)
        usedAst = true
      }
    }
    if (usedAst) {
      extractor = "py-ast"
    } else {
      extractor = "py-regex"
      extractPythonRich(lines, raw, imports, callsites)
    }
  } else if (ext === ".md") {
    extractor = "md"
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/)
      if (m) pushSym({ name: m[2].replace(/[`*_]/g, ""), kind: "heading", signature: null, doc: m[1].length + "x heading", startLine: i + 1, endLine: i + 1 })
    }
  } else if (ext === ".json" || ext === ".jsonc") {
    extractor = "json"
    // Strip comments / trailing commas, then read top-ish-level string keys.
    const cleaned = content
      .replace(/\/\/[^\n\r]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/,(\s*[}\]])/g, "$1")
    let parsed = null
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = null
    }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const keys = Object.keys(parsed).slice(0, 200)
      keys.forEach((k) => pushSym({ name: k, kind: "configKey", signature: null, doc: describeValue(parsed[k]), startLine: 1, endLine: 1 }))
    } else {
      // fallback: per-line quoted keys
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^\s*"([^"]+)"\s*:/)
        if (m) pushSym({ name: m[1], kind: "configKey", signature: null, doc: null, startLine: i + 1, endLine: i + 1 })
      }
    }
  } else if (ext === ".yml" || ext === ".yaml") {
    extractor = "yaml"
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^([A-Za-z0-9_.\-]+):\s*(.*)$/)
      if (m) pushSym({ name: m[1], kind: "configKey", signature: null, doc: m[2] ? m[2].slice(0, 80) : null, startLine: i + 1, endLine: i + 1 })
    }
  }

  // Deduplicate symbols by (name, startLine) while preserving order.
  const seen = new Set()
  const dedup = []
  for (const s of raw) {
    const k = s.name + "@" + s.startLine
    if (seen.has(k)) continue
    seen.add(k)
    dedup.push(s)
  }
  return { raw: dedup, imports, callsites, extractor }
}

function describeValue(v) {
  if (v === null) return "null"
  if (Array.isArray(v)) return "array[" + v.length + "]"
  return typeof v
}

// Compute rough symbol end lines: a symbol spans until the next symbol's start.
// Symbols produced by a real parser carry `endLineKnown: true` and an accurate
// span; those are left untouched so AST/`ast` spans are preserved (a method
// spanning its full body, an interface spanning its members, etc.). Only
// regex-extracted symbols (single-line, no real span) get the rough "until next
// symbol" assignment.
function assignEndLines(syms, totalLines) {
  const sorted = syms.slice().sort((a, b) => a.startLine - b.startLine)
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].endLineKnown) continue
    const next = sorted[i + 1]
    sorted[i].endLine = next ? Math.max(next.startLine - 1, sorted[i].startLine) : totalLines
  }
}

// --- process a single file -------------------------------------------------

function processFile(f, root, capturedAt, parsers) {
  let stat
  try {
    stat = fs.statSync(f.abs)
  } catch {
    stat = { mtimeMs: 0, size: 0 }
  }
  const mtimeMs = Math.floor(Number(stat.mtimeMs) || 0)
  const bytes = Number(stat.size) || 0
  let content = ""
  try {
    content = fs.readFileSync(f.abs, "utf8")
  } catch {
    content = ""
  }
  let binary = false
  if (content && content.indexOf("\u0000") !== -1) {
    binary = true
    content = ""
  }
  const sourceHash = sha256hex(content)
  const lines = content ? content.split(/\r?\n/) : []
  const ext = extOf(f.name)

  const prov = provenance(root, f.rel, sourceHash, mtimeMs, capturedAt)
  const fileId = "file:" + f.rel
  const tooLarge = bytes > 1024 * 1024

  // Secret scan gates persistence of any snippet/doc/signature.
  const secretReason = scanSecrets(content)
  if (secretReason) {
    const redactedHash = null
    const fileNode = {
      id: fileId,
      kind: "file",
      name: f.name,
      path: f.rel,
      ext,
      bytes,
      lines: lines.length,
      secretFlag: true,
      note: "content redacted: suspected secret (" + secretReason + ")",
      ...provenance(root, f.rel, redactedHash, mtimeMs, capturedAt),
    }
    return { fileNode, syms: [], imports: [], callsites: [], sourceHash: redactedHash, mtimeMs, secretFlag: true, binary, extractor: "secret" }
  }

  if (tooLarge) {
    const fileNode = {
      id: fileId,
      kind: "file",
      name: f.name,
      path: f.rel,
      ext,
      bytes,
      lines: lines.length,
      secretFlag: false,
      note: "large file: extraction skipped",
      snippet: null,
      ...prov,
    }
    return { fileNode, syms: [], imports: [], callsites: [], sourceHash, mtimeMs, secretFlag: false, binary, extractor: "large" }
  }

  const extracted = extractByExt(f.name, content, lines, ext, parsers)
  assignEndLines(extracted.raw, lines.length)

  const syms = extracted.raw.map((s) => {
    const id = "symbol:" + f.rel + ":" + s.startLine + ":" + s.name
    return {
      id,
      kind: "symbol",
      name: s.name,
      symbolKind: s.kind,
      signature: s.signature || null,
      doc: s.doc || null,
      startLine: s.startLine,
      endLine: s.endLine,
      ...provenance(root, f.rel, sourceHash, mtimeMs, capturedAt),
    }
  })

  const note = binary ? "binary: no text extracted" : null
  const fileNode = {
    id: fileId,
    kind: "file",
    name: f.name,
    path: f.rel,
    ext,
    bytes,
    lines: lines.length,
    secretFlag: false,
    note,
    // cheap structural snippet: non-secret first non-empty line for quick context
    snippet: content && !tooLarge && !binary ? firstMeaningfulLine(lines) : null,
    ...prov,
  }

  return { fileNode, syms, imports: extracted.imports, callsites: extracted.callsites, sourceHash, mtimeMs, secretFlag: false, binary, extractor: binary ? "binary" : extracted.extractor }
}

function firstMeaningfulLine(lines) {
  for (const l of lines) {
    const t = l.trim()
    if (!t) continue
    if (t.length > 120) return t.slice(0, 120) + "..."
    return t
  }
  return null
}

// --- main pipeline ---------------------------------------------------------

export async function generateCodemap(opts = {}) {
  const t0 = performance.now()
  const root = path.resolve(String(opts.root || process.cwd()))
  let out = path.resolve(root, ".opencode", "codemap")
  const limit = Math.max(1, Math.floor(Number(opts.limit) || 200000))
  const capturedAt = nowIso()

  try {
    validateRoot(root)
    out = resolveOut(root, opts.out)
    // Discover optional richer parsers once (cached for the process lifetime).
    const parsers = await initParsers()
    const tScan = performance.now()
    const files = []
    await walk(root, root, files, limit)
    const scanMs = round(performance.now() - tScan)

    const projectNode = {
      id: "project:" + toPosix(path.basename(root)),
      kind: "project",
      name: path.basename(root) || root,
      path: ".",
      ...provenance(root, ".", sha256hex(root + "\n" + files.length), 0, capturedAt),
    }

    const nodes = [projectNode]
    const edges = []
    const filesMap = {}
    let secretFlagged = 0

    const tExtract = performance.now()
    const perFile = []
    const relSet = new Set(files.map((f) => f.rel))

    for (const f of files) {
      const rec = processFile(f, root, capturedAt, parsers)
      perFile.push({ f, rec })
      nodes.push(rec.fileNode)
      for (const s of rec.syms) {
        nodes.push(s)
        edges.push({
          id: "defines:" + rec.fileNode.id + "->" + s.id,
          type: "defines",
          from: rec.fileNode.id,
          to: s.id,
          targetStatus: "resolved",
          kind: "file->symbol",
          ...provenance(root, f.rel, rec.sourceHash, rec.mtimeMs, capturedAt),
        })
      }
      filesMap[f.rel] = {
        hash: rec.sourceHash,
        mtimeMs: rec.mtimeMs,
        nodes: 1 + rec.syms.length,
        secretFlag: rec.secretFlag,
      }
      if (rec.secretFlag) secretFlagged++
    }

    // imports (resolved + unresolved), calls (resolved local), documents (md -> code symbol).
    const nameToSyms = new Map()
    const seenDocumentEdges = new Set()
    for (const { f, rec } of perFile) {
      for (const s of rec.syms) {
        if (s.name.length < 3 || STOP_NAMES.has(s.name.toLowerCase())) continue
        const key = s.name.toLowerCase()
        if (!nameToSyms.has(key)) nameToSyms.set(key, [])
        nameToSyms.get(key).push({ symId: s.id, rel: f.rel, kind: s.symbolKind })
      }
    }

    for (const { f, rec } of perFile) {
      const fileId = rec.fileNode.id
      const provImp = provenance(root, f.rel, rec.sourceHash, rec.mtimeMs, capturedAt)
      // imports
      const seenImp = new Set()
      for (const imp of rec.imports) {
        const key = imp.spec + ":" + imp.line
        if (seenImp.has(key)) continue
        seenImp.add(key)
        const resolvedRel = resolveImport(imp.spec, f.rel, relSet)
        const toId = resolvedRel ? "file:" + resolvedRel : null
        edges.push({
          id: "imports:" + fileId + "->" + (toId || imp.spec),
          type: "imports",
          from: fileId,
          to: toId,
          targetRef: toId ? null : imp.spec,
          targetStatus: toId ? "resolved" : "unresolved",
          kind: "file->file",
          ...provImp,
        })
      }
      // resolved local calls
      if (!rec.binary && rec.syms.length) {
        const localFn = new Map()
        for (const s of rec.syms) {
          // Local callables include functions, methods, and accessors so a
          // direct call to a sibling method/accessor resolves within the file.
          if (s.symbolKind === "function" || s.symbolKind === "method" || s.symbolKind === "accessor") {
            localFn.set(s.name.toLowerCase(), s)
          }
        }
        const seenCall = new Set()
        for (const c of rec.callsites) {
          const target = localFn.get(c.name.toLowerCase())
          if (!target) continue
          const caller = enclosingSymbol(rec.syms, c.line) || rec.fileNode
          // Drop self-loops (a callable calling itself). With AST extraction the
          // call-expression node sits inside the callee body (not on its
          // declaration line), so enclosing-symbol attribution is accurate; the
          // self-loop drop remains as a safety net and keeps recall precision high.
          if (caller.id === target.id) continue
          const key = caller.id + "->" + target.id
          if (seenCall.has(key)) continue
          seenCall.add(key)
          edges.push({
            id: "calls:" + key,
            type: "calls",
            from: caller.id,
            to: target.id,
            targetStatus: "resolved",
            kind: caller.kind === "symbol" ? "symbol->symbol" : "file->symbol",
            ...provenance(root, f.rel, rec.sourceHash, rec.mtimeMs, capturedAt),
          })
        }
      }
      // documents: markdown file references a code symbol by name
      if (extOf(f.name) === ".md" && !rec.secretFlag) {
        let mdContent = ""
        try {
          mdContent = fs.readFileSync(f.abs, "utf8")
        } catch {
          mdContent = ""
        }
        const lower = mdContent.toLowerCase()
        let added = 0
        for (const [nm, list] of nameToSyms) {
          if (added >= 40) break
          if (!wordContains(lower, nm)) continue
          // link to the first non-md symbol with that name
          const target = list.find((x) => x.rel !== f.rel && x.kind !== "heading")
          if (!target) continue
          const key = "documents:" + fileId + "->" + target.symId
          if (seenDocumentEdges.has(key)) continue
          seenDocumentEdges.add(key)
          edges.push({
            id: key,
            type: "documents",
            from: fileId,
            to: target.symId,
            targetStatus: "resolved",
            kind: "file->symbol",
            ...provImp,
          })
          added++
        }
      }
    }

    const extractMs = round(performance.now() - tExtract)

    // Tally which extractor handled each file (manifest parser info; does not
    // feed node/edge digests, so it cannot break reproducible integrity).
    const parserUsage = { jsAst: 0, jsRegex: 0, pyAst: 0, pyRegex: 0, text: 0, binary: 0, secret: 0, large: 0 }
    for (const { rec } of perFile) {
      const e = rec.extractor
      if (e === "js-ast") parserUsage.jsAst++
      else if (e === "js-regex") parserUsage.jsRegex++
      else if (e === "py-ast") parserUsage.pyAst++
      else if (e === "py-regex") parserUsage.pyRegex++
      else if (e === "binary") parserUsage.binary++
      else if (e === "secret") parserUsage.secret++
      else if (e === "large") parserUsage.large++
      else parserUsage.text++
    }

    nodes.sort(byNode)
    edges.sort(byEdge)

    const symbolCount = nodes.reduce((n, x) => n + (x.kind === "symbol" ? 1 : 0), 0)

    const tPersist = performance.now()
    const nodesText = nodes.map((n) => JSON.stringify(n)).join("\n") + "\n"
    const edgesText = edges.map((e) => JSON.stringify(e)).join("\n") + "\n"
    // Digests over canonical (capturedAt-stripped) form for reproducible integrity.
    const nodesDigest = sha256hex(nodes.map(canonicalLine).join("\n") + "\n")
    const edgesDigest = sha256hex(edges.map(canonicalLine).join("\n") + "\n")
    await fsp.mkdir(out, { recursive: true })
    await atomicWrite(path.join(out, "nodes.jsonl"), nodesText)
    await atomicWrite(path.join(out, "edges.jsonl"), edgesText)

    const generatedAt = nowIso()
    const manifest = {
      version: MANIFEST_VERSION,
      generator: GENERATOR,
      root,
      generatedAt,
      counts: {
        files: files.length,
        symbols: symbolCount,
        nodes: nodes.length,
        edges: edges.length,
        secretFlagged,
      },
      files: filesMap,
      timingsMs: { scan: scanMs, extract: extractMs, persist: 0, total: 0 },
      digests: { nodes: nodesDigest, edges: edgesDigest },
      parsers: {
        typescript: { available: !!parsers.ts, version: parsers.tsVersion || null },
        python: { available: !!parsers.py, bin: parsers.py ? parsers.py.cmd : null },
        usage: parserUsage,
      },
    }
    manifest.timingsMs.persist = round(performance.now() - tPersist)
    manifest.timingsMs.total = round(performance.now() - t0)
    await atomicWrite(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n")

    return {
      ok: true,
      manifest,
      markdown: renderGenerate(manifest, out, files.length, edges.length),
      generatedAt,
    }
  } catch (err) {
    return {
      ok: false,
      error: errMsg(err),
      markdown: blockedMarkdown("generate", root, err),
    }
  }
}

function enclosingSymbol(syms, line) {
  let best = null
  for (const s of syms) {
    if (s.startLine <= line && s.endLine >= line) {
      if (!best || s.startLine > best.startLine) best = s
    }
  }
  return best
}

function wordContains(haystackLower, wordLower) {
  if (wordLower.length < 4) return false
  return wordBoundaryRe(wordLower).test(haystackLower)
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function errMsg(err) {
  if (!err) return "unknown error"
  if (err && typeof err.message === "string") return err.message
  return String(err)
}

// --- recall ----------------------------------------------------------------

async function loadGraph(root, out) {
  const manifest = await readJsonIfExists(path.join(out, "manifest.json"))
  if (!manifest || !manifest.counts) {
    return { missing: true }
  }
  const nodes = await readJsonl(path.join(out, "nodes.jsonl"))
  const edges = await readJsonl(path.join(out, "edges.jsonl"))
  return { missing: false, manifest, nodes, edges }
}

function indexEdges(edges) {
  const idx = new Map() // nodeId -> { out: [], in: [] }
  const get = (id) => {
    let v = idx.get(id)
    if (!v) {
      v = { out: [], in: [] }
      idx.set(id, v)
    }
    return v
  }
  for (const e of edges) {
    if (e.from) get(e.from).out.push(e)
    if (e.to) get(e.to).in.push(e)
  }
  return idx
}

const WORD_BOUNDARY_RE_CACHE = new Map()

function wordBoundaryRe(wordLower) {
  let re = WORD_BOUNDARY_RE_CACHE.get(wordLower)
  if (!re) {
    re = new RegExp("(?:^|[^A-Za-z0-9_])" + escapeRegex(wordLower) + "(?:[^A-Za-z0-9_]|$)")
    WORD_BOUNDARY_RE_CACHE.set(wordLower, re)
  }
  return re
}

function scoredMatch(node, qLower, qWordRe) {
  const name = (node.name || "").toLowerCase()
  let score = 0
  if (name === qLower) score += 100
  else if (name && wordB(name, qWordRe)) score += 60
  else if (name.includes(qLower)) score += 40
  const path = (node.path || "").toLowerCase()
  if (path.includes(qLower)) score += 15
  const sig = (node.signature || "").toLowerCase()
  if (sig.includes(qLower)) score += 8
  const doc = (node.doc || "").toLowerCase()
  if (doc.includes(qLower)) score += 5
  return { node, score }
}

function wordB(hayLower, qWordRe) {
  return qWordRe.test(hayLower)
}

export async function recallCodemap(opts = {}) {
  const root = path.resolve(String(opts.root || process.cwd()))
  let out = path.resolve(root, ".opencode", "codemap")
  const query = String(opts.query || "").trim()
  const limit = Math.max(1, Math.min(200, Math.floor(Number(opts.limit) || 20)))
  const t0 = performance.now()

  try {
    validateRoot(root)
    out = resolveOut(root, opts.out)
    const graph = await loadGraph(root, out)
    if (graph.missing) {
      return {
        ok: false,
        missing: true,
        markdown: blockedMissing(out, "recall", query),
        query,
      }
    }
    const { manifest, nodes, edges } = graph

    if (!query) {
      const ms = round(performance.now() - t0)
      return {
        ok: true,
        manifest,
        results: [],
        count: 0,
        ms,
        markdown: renderRecallEmpty(manifest, query, ms),
      }
    }

    const q = query.toLowerCase()
    const qWordRe = wordBoundaryRe(q)
    const matched = []
    for (const n of nodes) {
      if (n.kind !== "symbol" && n.kind !== "file") continue
      const sc = scoredMatch(n, q, qWordRe)
      if (sc.score > 0) matched.push(sc)
    }
    matched.sort((a, b) => b.score - a.score || byNode(a.node, b.node))

    const edgeIdx = indexEdges(edges)
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    const top = matched.slice(0, limit).map((m) => m.node)
    const results = top.map((n) => ({
      node: n,
      edges: relatedEdges(n.id, edgeIdx, nodeById),
    }))
    const ms = round(performance.now() - t0)

    return {
      ok: true,
      manifest,
      results,
      count: matched.length,
      ms,
      markdown: renderRecall(query, results, matched.length, manifest, ms),
    }
  } catch (err) {
    return {
      ok: false,
      error: errMsg(err),
      markdown: blockedMarkdown("recall", root, err),
      query,
    }
  }
}

function relatedEdges(id, edgeIdx, nodeById) {
  const entry = edgeIdx.get(id) || { out: [], in: [] }
  const out = entry.out.slice(0, 8).map((e) => {
    const t = e.to ? nodeById.get(e.to) : null
    return {
      type: e.type,
      direction: "out",
      target: t ? labelOf(t) : e.targetRef || "?",
      targetStatus: e.targetStatus,
    }
  })
  const incoming = entry.in.slice(0, 8).map((e) => {
    const f = nodeById.get(e.from)
    return {
      type: e.type,
      direction: "in",
      source: f ? labelOf(f) : "?",
      targetStatus: e.targetStatus,
    }
  })
  return { out, in: incoming }
}

function labelOf(n) {
  if (n.kind === "file") return n.path
  return n.name + " (" + (n.symbolKind || n.kind) + ")"
}

// --- health ----------------------------------------------------------------

export async function healthCodemap(opts = {}) {
  const root = path.resolve(String(opts.root || process.cwd()))
  let out = path.resolve(root, ".opencode", "codemap")
  const staleThreshold = Math.max(1, Math.floor(Number(opts.staleThreshold) || 24 * 3600 * 1000))

  try {
    validateRoot(root)
    out = resolveOut(root, opts.out)
    const manifest = await readJsonIfExists(path.join(out, "manifest.json"))
    if (!manifest || !manifest.counts) {
      return { ok: true, status: "missing", markdown: renderHealthMissing(out) }
    }

    const ageMs = Math.max(0, Date.now() - new Date(manifest.generatedAt).getTime())
    const stale = ageMs > staleThreshold

    // Drift: compare manifest.files against the current filesystem.
    const t0 = performance.now()
    const current = []
    await walk(root, root, current, 200000)
    const curMap = new Map()
    for (const c of current) curMap.set(c.rel, c)

    let unchanged = 0
    let changed = 0
    let removed = 0
    const changedFiles = []
    for (const [rel, info] of Object.entries(manifest.files || {})) {
      const c = curMap.get(rel)
      if (!c) {
        removed++
        continue
      }
      let st
      try {
        st = fs.statSync(c.abs)
      } catch {
        removed++
        continue
      }
      const mtimeChanged = Math.floor(Number(st.mtimeMs) || 0) !== info.mtimeMs
      if (!mtimeChanged) {
        unchanged++
      } else {
        // re-hash to confirm real content change (mtime is a cheap proxy only).
        let content = ""
        try {
          content = fs.readFileSync(c.abs, "utf8")
        } catch {
          content = ""
        }
        const h = sha256hex(content)
        if (info.hash && h === info.hash) unchanged++
        else {
          changed++
          if (changedFiles.length < 12) changedFiles.push(rel)
        }
      }
    }
    let added = 0
    for (const rel of curMap.keys()) {
      if (!(rel in (manifest.files || {}))) added++
    }
    const driftMs = round(performance.now() - t0)

    let status = "ok"
    if (stale) status = "stale"
    if (changed > 0 || added > 0 || removed > 0) status = "drift"

    const secretFlagged = manifest.counts.secretFlagged || 0
    const health = {
      status,
      stale,
      ageMs,
      staleThresholdMs: staleThreshold,
      generatedAt: manifest.generatedAt,
      filesInGraph: Object.keys(manifest.files || {}).length,
      currentFiles: curMap.size,
      unchanged,
      changed,
      added,
      removed,
      secretFlagged,
      driftMs,
      changedSample: changedFiles,
      counts: manifest.counts,
      digests: manifest.digests,
    }
    return {
      ok: true,
      status,
      health,
      manifest,
      markdown: renderHealth(health, out, root),
    }
  } catch (err) {
    return {
      ok: false,
      error: errMsg(err),
      markdown: blockedMarkdown("health", root, err),
    }
  }
}

// --- bench -----------------------------------------------------------------

export async function benchCodemap(opts = {}) {
  const root = path.resolve(String(opts.root || process.cwd()))
  let out = path.resolve(root, ".opencode", "codemap")
  const query = String(opts.query || "codemap")
  const limit = Math.max(1, Math.min(200, Math.floor(Number(opts.limit) || 5)))

  try {
    validateRoot(root)
    out = resolveOut(root, opts.out)
  } catch (err) {
    return {
      ok: false,
      root,
      out,
      query,
      generateMs: 0,
      recallMs: 0,
      totalMs: 0,
      speedup: null,
      counts: null,
      recallMatches: null,
      genError: errMsg(err),
      recError: null,
      markdown: blockedMarkdown("bench", root, err),
    }
  }

  const t0 = performance.now()
  const gen = await generateCodemap({ root, out })
  const generateMs = round(performance.now() - t0)

  const t1 = performance.now()
  const rec = await recallCodemap({ root, out, query, limit })
  const recallMs = round(performance.now() - t1)

  const totalMs = round(performance.now() - t0)
  const counts = gen.manifest && gen.manifest.counts ? gen.manifest.counts : null

  const data = {
    ok: gen.ok && rec.ok,
    root,
    out,
    query,
    generateMs,
    recallMs,
    totalMs,
    speedup: recallMs > 0 ? Number((generateMs / recallMs).toFixed(1)) : null,
    counts,
    recallMatches: typeof rec.count === "number" ? rec.count : null,
    genError: gen.ok ? null : gen.error,
    recError: rec.ok ? null : rec.error,
  }
  return { ...data, markdown: renderBench(data) }
}

// --- renderers -------------------------------------------------------------

function blockedMarkdown(op, root, err) {
  return (
    "# Codemap " + op + " blocked\n\n" +
    "- Root: `" + root + "`\n" +
    "- Error: " + errMsg(err) + "\n\n" +
    "No destructive action was taken. Check the root path and that the directory is readable. " +
    "If this is a permission/read failure on a credential-like path, it was correctly excluded.\n"
  )
}

function blockedMissing(out, op, query) {
  return (
    "# Codemap " + op + " blocked\n\n" +
    (query ? "- Query: `" + mdInline(query) + "`\n" : "") +
    "- Output dir: `" + out + "`\n" +
    "- Reason: no `manifest.json` / `nodes.jsonl` / `edges.jsonl` found.\n\n" +
    "Run `code_memory generate` (or `npm run codemap:generate`) first to build the overlay, then recall.\n"
  )
}

function renderGenerate(manifest, out, fileCount, edgeCount) {
  const c = manifest.counts
  const t = manifest.timingsMs
  const p = manifest.parsers || {}
  const ts = p.typescript || {}
  const py = p.python || {}
  const u = p.usage || {}
  const parserLine =
    "- Parsers: typescript " + (ts.available ? "on" + (ts.version ? " (" + ts.version + ")" : "") : "off (regex fallback)") +
    " | python " + (py.available ? "on (" + py.bin + ")" : "off (regex fallback)") +
    " | usage js-ast " + (u.jsAst || 0) + " js-regex " + (u.jsRegex || 0) +
    " py-ast " + (u.pyAst || 0) + " py-regex " + (u.pyRegex || 0) + " text " + (u.text || 0) + "\n"
  return (
    "# Codemap generated\n\n" +
    "- Root: `" + manifest.root + "`\n" +
    "- Generated: " + manifest.generatedAt + "\n" +
    "- Files: " + c.files + " | Symbols: " + c.symbols + " | Edges: " + c.edges + " | Secret-flagged: " + c.secretFlagged + "\n" +
    "- Nodes: " + c.nodes + " | Output: `" + toPosix(out) + "/{nodes.jsonl,edges.jsonl,manifest.json}`\n" +
    parserLine +
    "- Timings (ms): scan " + t.scan + " | extract " + t.extract + " | persist " + t.persist + " | total " + t.total + "\n" +
    "- Digests: nodes `sha256:" + manifest.digests.nodes.slice(0, 12) + "...` edges `sha256:" + manifest.digests.edges.slice(0, 12) + "...`\n\n" +
    "Next: `codemap_health` for drift; `code_memory recall \"<query>\"` for structural lookup from the precomputed graph.\n"
  )
}

function renderRecallEmpty(manifest, query, ms) {
  return (
    "# Codemap recall\n\n" +
    (query ? "- Query: `" + mdInline(query) + "`\n" : "- Query: _(none)_\n") +
    "- Graph: " + manifest.counts.nodes + " nodes / " + manifest.counts.edges + " edges (" + manifest.counts.files + " files)\n" +
    "- Looked up in " + ms + " ms\n\n" +
    "No query term supplied (or empty). Pass `--query`/`query` to match symbol/file names, paths, signatures, and docs.\n"
  )
}

function renderRecall(query, results, totalMatches, manifest, ms) {
  const lines = []
  lines.push("# Codemap recall: `" + mdInline(query) + "`")
  lines.push("")
  lines.push("- Matched " + totalMatches + " node(s); showing top " + results.length + " of " + manifest.counts.nodes + " nodes in " + ms + " ms.")
  lines.push("- Graph generated " + manifest.generatedAt + " (" + manifest.counts.files + " files, " + manifest.counts.edges + " edges).")
  lines.push("")
  if (!results.length) {
    lines.push("No matches. Broaden the query, or regenerate with `code_memory generate` if the codebase changed.")
    return lines.join("\n") + "\n"
  }
  for (const r of results) {
    const n = r.node
    const loc = n.path + (n.startLine ? ":" + n.startLine : "")
    lines.push("## " + (n.symbolKind || n.kind) + " — `" + mdInline(n.name) + "`")
    lines.push("- file: `" + mdInline(loc) + "`")
    if (n.signature) lines.push("- signature: `" + mdInline(truncate(n.signature, 140)) + "`")
    if (n.doc) lines.push("- doc: " + truncate(n.doc, 160))
    if (n.secretFlag) lines.push("- **secret-flagged**: content redacted")
    const out = (r.edges && r.edges.out) || []
    const incoming = (r.edges && r.edges.in) || []
    if (out.length) lines.push("- outgoing: " + out.map((e) => e.type + "→" + e.target + (e.targetStatus === "unresolved" ? " (unresolved)" : "")).join("; "))
    if (incoming.length) lines.push("- referenced by: " + incoming.map((e) => e.source).join("; "))
    lines.push("")
  }
  return lines.join("\n")
}

function truncate(s, n) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim()
  return t.length > n ? t.slice(0, n) + "..." : t
}

function renderHealthMissing(out) {
  return (
    "# Codemap health: missing\n\n" +
    "- Output dir: `" + toPosix(out) + "`\n" +
    "- No generated overlay found.\n\n" +
    "Run `code_memory generate` (or `npm run codemap:generate`) to build it.\n"
  )
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return s + "s"
  const m = Math.floor(s / 60)
  if (m < 60) return m + "m " + (s % 60) + "s"
  const h = Math.floor(m / 60)
  return h + "h " + (m % 60) + "m"
}

function renderHealth(h, out, root) {
  const lines = []
  lines.push("# Codemap health")
  lines.push("")
  lines.push("- Status: **" + h.status + "**")
  lines.push("- Root: `" + mdInline(root) + "` | Output: `" + mdInline(toPosix(out)) + "`")
  lines.push("- Generated: " + h.generatedAt + " (age " + fmtDuration(h.ageMs) + "; stale threshold " + fmtDuration(h.staleThresholdMs) + ")")
  lines.push("- Files: " + h.filesInGraph + " in graph | " + h.currentFiles + " current | unchanged " + h.unchanged + " | changed " + h.changed + " | added " + h.added + " | removed " + h.removed)
  lines.push("- Secret-flagged: " + h.secretFlagged + " | Drift scan: " + h.driftMs + " ms")
  if (h.changedSample && h.changedSample.length) {
    lines.push("- Changed sample: " + h.changedSample.map((p) => "`" + p + "`").join(", "))
  }
  lines.push("- Nodes " + (h.counts ? h.counts.nodes : "?") + " / Edges " + (h.counts ? h.counts.edges : "?") + " | nodes digest `sha256:" + ((h.digests && h.digests.nodes || "").slice(0, 12)) + "...`")
  lines.push("")
  let rec
  if (h.status === "ok") rec = "Overlay is fresh and in sync. Structural recall via `code_memory recall` is valid."
  else if (h.status === "missing") rec = "Run `code_memory generate`."
  else if (h.status === "stale") rec = "Overlay is older than the stale threshold; regenerate (`code_memory generate`) before trusting recall."
  else rec = "Codebase drifted since last generate (" + (h.changed + h.added + h.removed) + " changed/added/removed). Regenerate to refresh the overlay."
  lines.push("- Recommendation: " + rec)
  return lines.join("\n") + "\n"
}

function renderBench(d) {
  return (
    "# Codemap bench\n\n" +
    "- Root: `" + mdInline(d.root) + "` | Query: `" + mdInline(d.query) + "`\n" +
    "- Generate (full ECL): " + d.generateMs + " ms | Recall (graph query): " + d.recallMs + " ms\n" +
    (d.speedup ? "- Structural recall is ~" + d.speedup + "x faster than rebuilding cartography.\n" : "") +
    "- Counts: " + (d.counts ? "files " + d.counts.files + ", symbols " + d.counts.symbols + ", edges " + d.counts.edges : "n/a") + " | recall matches: " + (d.recallMatches == null ? "n/a" : d.recallMatches) + "\n"
  )
}
