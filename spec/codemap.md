# Spec: Code Memory (local code graph)

Status: v1.1, shipped. Owner: `tools/codemap` + `tools/code_memory.ts` + `tools/codemap_health.ts`.

## Goal

A Cognee-like **local code-memory overlay** for VulcanCode: a deterministic
Extract -> Cognify -> Load (ECL) pipeline that scans a repo for code/docs and
persists a precomputed graph (`files`, `symbols`, `edges`) so later tasks do
**structural recall** as a cheap graph query instead of rebuilding cartography
from scratch every task.

- v1.1 upgrades Cognify with **optional real parsers**: the JS/TS family is
  parsed with the TypeScript compiler API only when a trusted engine-local
  `typescript` install resolves, and Python is parsed with the stdlib `ast`
  module only when explicitly opted in via an absolute
  `VULCAN_CODE_MEMORY_PYTHON` path. Both degrade to the v1 regex extractors if
  unavailable or on a parse failure, so the engine never hard-depends on either.
  "Good enough to steer recall" still beats "precise but slow or fragile".
- Non-goal: a remote/vector store. This is fully local; no network, no embeddings,
  no hard external deps beyond Node built-ins (`node:child_process` is now used
  for the optional Python subprocess).

## Components

| Path | Role |
|---|---|
| `tools/codemap/lib.mjs` | Engine. Pure Node ESM. Exports `generateCodemap`, `recallCodemap`, `healthCodemap`, `benchCodemap`. |
| `tools/codemap/lib.d.mts` | Type declarations (lets the TS plugin tools typecheck against `import("./codemap/lib.mjs")`). |
| `tools/codemap/{generate,recall,health,bench}.mjs` | CLI wrappers. `--root --out --query --limit`. Markdown out for generate/recall/health; JSON for bench. |
| `tools/code_memory.ts` | Plugin tool `code_memory` (op = generate\|recall\|health\|bench). Dynamic-imports the engine. |
| `tools/codemap_health.ts` | Plugin tool `codemap_health` (quick health). |
| `command/codemap.md` | Slash-command wrapper. |
| `agent/code-memory-curator.md` | Safe subagent that builds/curates/recalls the overlay. |

## Output layout

Written to `<out>` (default `<root>/.opencode/codemap`). For safety, `<out>`
must resolve to `<root>/.opencode/codemap` or a descendant; outside output paths
are rejected before writes:

- `nodes.jsonl` — one JSON node per line.
- `edges.jsonl` — one JSON edge per line.
- `manifest.json` — version, generator, root, generatedAt, counts, files map,
  timings, digests, and `parsers` (which richer parsers were available + per-file
  extractor usage). `parsers` records environment/availability and does **not**
  feed the node/edge digests, so it cannot break reproducible integrity.

Writes are atomic-ish: write to `<file>.<pid>.tmp` then `rename` over the target.

## Data model

### Node

Every node carries provenance: `repoRoot`, `path` (posix relpath), `startLine`,
`endLine`, `sourceHash` (sha256 of owning file utf8 content; `null` for
secret-flagged files), `mtimeMs`,
`capturedAt` (ISO, set once per run), `capturedBy` (`vulcan-codemap`), `status`
(`fresh` by default).

- `project` — one per manifest. `id = "project:<basename>"`.
- `file` — one per scanned file. Fields: `name`, `path`, `ext`, `bytes`, `lines`,
  `secretFlag`, optional `note` (binary/large/redacted), optional `snippet`
  (first meaningful line, non-secret only). `id = "file:<relpath>"`.
- `symbol` — `name`, `symbolKind`, `signature` (nullable), `doc` (nullable),
  `startLine`/`endLine`. `id = "symbol:<relpath>:<line>:<name>"`.
  - Kinds: `function`, `class`, `method`, `accessor` (get/set), `interface`,
    `type` (alias), `enum`, `namespace`, `const`/`export` (variable bindings),
    `heading` (markdown), `configKey` (json/jsonc/yaml). Constructors are tagged
    `method` (name `constructor`). `async`/generators are folded into
    `function`/`method`; `symbolKind` is the discriminator. (v1 kinds `function`,
    `class`, `export`, `heading`, `configKey` are preserved; the rest are added by
    the AST parsers and appear only when a richer parser is available.)

### Edge

Edges carry provenance like nodes plus `from`, `to` (nullable), `targetRef`
(nullable, for unresolved), `targetStatus` (`resolved` | `unresolved`), `kind`
(`file->symbol` | `file->file` | `symbol->symbol`).

- `defines` — file -> symbol. Always resolved.
- `imports` — file -> file. Relative specifiers resolved against the importing
  file's dir with extension/index probing; bare specifiers (react, fs, @scope/pkg)
  are `unresolved` with `targetRef` = the spec.
- `calls` — symbol -> symbol (resolved local calls only). A call site `name(` is
  linked to a same-file function symbol named `name`, attributed to the enclosing
  symbol (or the file node if none). v1 does not emit unresolved calls (too noisy).
- `documents` — markdown file -> code symbol, when the symbol's name (length >= 4,
  not a stop-word) appears as a whole word in the markdown. Capped per file and
  deduped.

## Extraction (Cognify)

Languages/formats (by extension): `.ts .tsx .js .jsx .mjs .cjs` (JS family),
`.py`, `.md`, `.json .jsonc`, `.yml .yaml`.

Parsers are **optional** and probed once per process (cached). Each extractor
records which path it used; `manifest.parsers.usage` tallies per-file counts.

- **JS/TS family** — when a trusted engine-local `typescript` module resolves,
  the source is parsed with `ts.createSourceFile` (pure parse; no
  typecheck/Program, so no gating on diagnostics — a usable tree is produced even
  on imperfect code). The engine does not import project-local parser packages;
  if a trusted parser is unavailable, regex fallback is used. Extracted:
  `function`/`async function`/generators, `class`, class **methods** and
  **get/set accessors**, **constructors**, `interface`, `type` aliases, `enum`,
  `namespace`/`module`, and **variable bindings** (`export` if exported, `const`
  otherwise; arrow/function-expression initializers are tagged `function`).
  Imports include side-effect (`import "./x"`) and re-export (`export ... from`)
  specs. Call sites are direct `Identifier` callees only (property/method calls
  are dropped to keep the local call graph high-precision). `startLine`/`endLine`
  come from the node's real span. Signatures are the declaration head (function
  body start / first member), whitespace-collapsed, falling back to the source
  line; `doc` is the last leading `//` or `/** */` comment.
  - If `typescript` is absent or `createSourceFile` throws, the v1 line regex
    runs instead (imports/require, `export const/let/var`, `function`, `class`,
    arrow assignments, call sites).
- **Python** — AST parsing is opt-in only. Set `VULCAN_CODE_MEMORY_PYTHON` to an
  absolute trusted Python 3 binary; the engine never searches `PATH`. When set,
  source is parsed with stdlib `ast` in a short-lived spawned process with a
  scrubbed environment. Content is passed as JSON over **stdin bytes**
  (`sys.stdin.buffer.read()` + `json.loads`), decoded as UTF-8 regardless of host
  locale; a leading UTF-8 BOM is tolerated. Extracted: `function`/`async def`,
  `class`, and **methods** (FunctionDef whose direct container is a ClassDef),
  with real `lineno`/`end_lineno` and docstrings. Imports (`import`,
  `from … import`) and direct Name call sites. Signatures are the declaration
  line. A per-file `SyntaxError` yields `{ok:false}` so that one bad file falls
  back to regex without failing the run.
  - If no trusted Python binary is configured or the parse/spawn fails, a richer
    line regex runs: indentation-aware method detection, `async def`, classes, a
    comment-above doc heuristic, imports, and call sites.
- **Markdown**: `#..######` headings (backticks/emphasis stripped).
- **JSON/JSONC**: comments/trailing commas stripped, top-level keys (capped) with a
  value-type `doc`; per-line quoted-key fallback if parse fails.
- **YAML**: top-level `key:` lines.

Symbol end-lines are real parser spans when available; for regex-extracted
symbols (no real span) the v1 "until the next symbol's start" approximation is
used. Symbols are deduped by `(name, startLine)`. Files >1 MB keep hashing but
skip extraction detail (note `large file`); binary files (NUL bytes) are noted
and skipped. The local `calls` resolver now treats `function`, `method`, and
`accessor` as callables, so a direct call to a sibling method/accessor resolves
within the file.

## Safety

1. **Path exclusion.** Never descended into: `node_modules`, `.git`, `dist`,
   `build`, `coverage`, `.cache`, `logs`, `.ssh`, `.aws`, `.azure`, `.kube`,
   `.gnupg`, the overlay's own `.opencode/codemap`, browser profile trees
   (`Google/Chrome/User Data`, `Microsoft/Edge/User Data`, `Mozilla/Firefox/Profiles`).
2. **File-name exclusion.** `.env*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.zip`,
   and names containing `token`, `secret`, `credentials` (case-insensitive).
3. **Content secret scan** (before any snippet/doc/signature is persisted):
   AWS access keys, Google API keys, GitHub `ghp_`/`github_pat_`, Slack tokens,
   Stripe keys, OpenAI `sk-` keys, bearer tokens (length-floored), PEM private-key
   blocks, and obvious secret assignments (`api_key|secret|token|password|...`
   `[:=] "..."` of 8+ chars). Placeholder values (`{env:NAME}`, `${NAME}`,
   `<NAME>`, `EXAMPLE...`) are exempted so example configs are not false-flagged.
4. **On a hit:** the file gets a `file` node with `secretFlag: true` and
    `note: "content redacted: suspected secret (<reason>)"`, and **no** symbols or
    snippets are extracted for it. The literal secret is never persisted, and the
    manifest/node `sourceHash` is redacted to avoid hashing secret-bearing content.
6. **Root/output guardrails.** The engine refuses filesystem roots, the user home
   directory itself, credential/browser/config roots such as `.ssh`, `.aws`,
   `.azure`, `.kube`, `.gnupg`, browser profiles, and `.config/opencode`. Output
   is restricted to `<root>/.opencode/codemap` or descendants so a tool call cannot
   redirect codemap writes into arbitrary filesystem locations.
5. The engine's own source contains these patterns as regex text but does not
   self-match (length floors + class gating); verified by running generate over
   this repo with 0 secret-flagged.

## Performance

- Single recursive scan (sorted for determinism); per-file sync read + extract.
- Recall loads the JSONL graph into memory once, builds a node->edges index, and
  scores matches (exact name > word-boundary > substring > signature/doc).
- Bench measures full ECL `generate` vs `recall`. On this repo (~96 files,
  ~750 symbols, ~1500 edges) recall is ~10-15x faster than regenerate (single-digit
  ms vs ~100-150 ms). Benefit grows with repo size.
- Determinism: nodes sorted (project, file, symbol; then id), edges sorted
  (from, type, to/targetRef). `manifest.digests` are sha256 over a **canonical**
  JSONL form with the volatile `capturedAt` omitted, so two generates over
  identical content at the same project root produce identical digests (the stored
  files still retain real `capturedAt`; provenance includes root/path data, so
  moving the repo changes root-dependent provenance/digests).

## Verification

```bash
# typecheck the plugin tools (tools/**/*.ts incl. the new ones)
npm run typecheck

# build the overlay into .opencode/codemap
node tools/codemap/generate.mjs --root <repo> --out <repo>/.opencode/codemap

# structural recall from the precomputed graph
node tools/codemap/recall.mjs --root <repo> --out <repo>/.opencode/codemap --query loop_guard --limit 5

# drift/staleness health
node tools/codemap/health.mjs --root <repo> --out <repo>/.opencode/codemap

# generate vs recall timings (JSON)
node tools/codemap/bench.mjs --root <repo> --out <repo>/.opencode/codemap --query memory --limit 5
```

Acceptance for this release:

- `npm run typecheck` is clean.
- `generate` produces `nodes.jsonl`, `edges.jsonl`, `manifest.json` with
  deterministic ordering and reproducible canonical digests (re-run yields the
  same digests).
- `recall` returns ranked matches with defining file + relevant edges; missing
  overlay returns a Blocked markdown (not a throw).
- `health` reports `ok` immediately after generate and `drift` after a tracked
  file is edited (and re-hashed to a different `sourceHash`).
- `bench` reports `recallMs` materially smaller than `generateMs`.
- 0 secret-flagged files on this repo (no false positives on docs/configs).

## Edge cases / limitations (v1.1)

- Richer parsers are best-effort and optional. When `typescript` is unavailable
  (e.g. the engine is loaded by a runtime whose module graph doesn't expose it)
  or a Python binary is missing, the JS/TS family and Python fall back to the
  line-regex extractors; `manifest.parsers` records availability + usage so the
  chosen path is visible. Signatures remain the declaration head/source line, not
  a fully normalized signature.
- The TS path uses `createSourceFile` (pure parse). It does not typecheck, so
  type-only import elision, conditional-typed bodies, and cross-file type
  resolution are not modeled. Imperfect source still yields a usable tree.
- Python is parsed one file per spawned process (stdlib `ast`). For repos with
  thousands of `.py` files this adds per-file process startup cost; a future
  batched invocation could amortize it. Per-file syntax errors fall back to regex
  for that file only.
- Call edges are same-file, resolved-only, **direct-callable** (Identifier
  callees; property/method calls like `this.foo()`/`obj.bar()` are not recorded),
  so method-to-method call graphs are partial. Bare/package imports are unresolved.
- Import resolution is relative-only; bare/spec package imports are unresolved
  (re-exports are captured as file->file dependency edges).
- `documents` edges are name-coincidence heuristics (capped, stop-worded); they
  are hints, not ground truth.
- Health drift detection re-hashes only files whose `mtimeMs` changed (fast path);
  a same-mtime content change would not be detected until the next generate.
- Recall is in-memory per call; very large repos (tens of thousands of files) may
  benefit from a future indexed store.
