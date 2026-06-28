const WORD_RE = /[^a-z0-9_.:-]+/i
const TOKEN_RE = /[a-z0-9][a-z0-9_.:-]{1,}/g

const STOPWORDS = new Set([
  "about",
  "after",
  "agent",
  "also",
  "and",
  "are",
  "can",
  "code",
  "for",
  "from",
  "gate",
  "has",
  "have",
  "into",
  "model",
  "models",
  "not",
  "only",
  "opencode",
  "project",
  "run",
  "setup",
  "state",
  "system",
  "task",
  "test",
  "that",
  "the",
  "this",
  "tool",
  "tools",
  "user",
  "vulcan",
  "vulcancode",
  "when",
  "with",
])

const REDACTIONS = [
  {
    kind: "private-key",
    pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
  },
  { kind: "bearer-token", pattern: /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/g },
  { kind: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: "openai-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g },
  { kind: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  {
    kind: "env-secret",
    pattern:
      /\b([A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|ACCESS_KEY|PRIVATE_KEY|CREDENTIAL)[A-Z0-9_]*)\s*=\s*("[^"]{4,}"|'[^']{4,}'|(?=[A-Za-z0-9_+=/@.-]{20,}\b)(?=[^\s`'"|]*[A-Za-z])(?=[^\s`'"|]*\d)[^\s`'"|]{20,})/g,
    replacement: "$1=# recall_bus redacted:env-secret",
  },
  { kind: "credential-uri", pattern: /\bfile:\/\/\/[^\s`'"|]*(?:credential|credentials|secret|secrets|\.env)[^\s`'"|]*/gi },
]

const SOURCE_WEIGHT = new Map([
  ["codemap", 100],
  ["memory-index", 80],
  ["rnd-spec", 70],
  ["speed-ledger", 60],
])

export function str(v, fallback = "") {
  const s = v == null ? "" : String(v)
  return s.trim() || fallback
}

export function words(v) {
  return new Set(String(v).toLowerCase().split(WORD_RE).filter((x) => x.length > 2 && !STOPWORDS.has(x)))
}

function rawWords(v) {
  return new Set(String(v).toLowerCase().split(WORD_RE).filter((x) => x.length > 2))
}

export function scoreText(text, query) {
  let q = [...words(query)]
  if (q.length === 0) q = [...rawWords(query)]
  if (q.length === 0) return 0
  const t = String(text).toLowerCase()
  const tokens = t.match(TOKEN_RE) || []
  const tokenCounts = new Map()
  for (const token of tokens) tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1)

  let distinct = 0
  let partial = 0
  let repeats = 0
  for (const w of q) {
    const exact = tokenCounts.get(w) || 0
    if (exact > 0) {
      distinct++
      repeats += Math.min(exact - 1, 3)
      continue
    }
    if (t.includes(w)) partial++
  }

  const coverage = distinct / q.length
  const partialCoverage = partial / q.length
  const phrase = q.length > 1 && t.includes(q.join(" ")) ? 8 : 0
  const density = distinct > 0 ? Math.min(6, (distinct * 120) / Math.max(tokens.length, 12)) : 0
  const allTerms = distinct === q.length ? 10 : 0
  const multiTerm = distinct >= 2 ? distinct * 2 : 0
  const repeatBonus = Math.min(4, repeats)
  return Number((distinct * 12 + coverage * 20 + partialCoverage * 4 + phrase + density + allTerms + multiTerm + repeatBonus).toFixed(3))
}

export function scopeTokens(scope) {
  if (scope == null) return []
  const values = Array.isArray(scope) ? scope : String(scope).split(/[,/\s]+/)
  return [...new Set(values.map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
}

export function memoryIndexTags(line) {
  const parts = String(line).split("|")
  const rawTags = parts.length >= 5 ? parts[4] : ""
  return new Set(String(rawTags).toLowerCase().split(/[,/\s]+/).map((x) => x.trim()).filter(Boolean))
}

export function memoryLineMatchesScope(line, scope) {
  const scopes = scopeTokens(scope)
  if (scopes.length === 0) return true
  const tags = memoryIndexTags(line)
  return scopes.some((token) => tags.has(token))
}

export function redact(text) {
  let output = String(text)
  try {
    for (const rule of REDACTIONS) {
      output = output.replace(rule.pattern, rule.replacement || `# recall_bus redacted:${rule.kind}`)
    }
    return output
  } catch {
    return "# recall_bus redacted:fault (output withheld)"
  }
}

// Excerpt is intentionally pure slicing. Callers that handle file or tool
// output must redact before excerpting so a budget-sized slice cannot split a
// secret across redaction boundaries; bench/recall-golden.mjs pins that order.
export function excerpt(text, query, max = 700) {
  const raw = String(text)
  const lower = raw.toLowerCase()
  const first = [...words(query)].find((w) => lower.includes(w))
  const idx = first ? Math.max(0, lower.indexOf(first) - 120) : 0
  return raw.slice(idx, idx + max).replace(/[\r\n]+/g, " ").trim()
}

export function normalizedScore(item) {
  const score = Number(item?.score || 0)
  if (score <= 0) return 0
  return score + (SOURCE_WEIGHT.get(String(item.source)) || 50) / 1000
}

export function rankItems(items, limit = 12) {
  return items
    .filter((item) => Number(item?.score || 0) > 0)
    .map((item, index) => ({ ...item, index, normalized: normalizedScore(item) }))
    .sort((a, b) => b.normalized - a.normalized || b.score - a.score || a.index - b.index)
    .slice(0, limit)
}

export function renderRecall({ query, budget = 5000, limit = 12, items = [] }) {
  const safeBudget = Math.max(1000, Math.min(20000, Number(budget || 5000)))
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limit || 12))))
  const ranked = rankItems(items, safeLimit)
  const lines = [`# Recall Bus`, ``, `Query: \`${redact(str(query))}\``, `Budget: ${safeBudget} chars`, ``]
  let used = lines.join("\n").length
  let rendered = 0
  let omitted = 0
  const maxItemText = Math.max(240, Math.min(1200, Math.floor(safeBudget / Math.max(2, Math.min(safeLimit, 6))) - 80))
  for (const item of ranked) {
    const redactedText = redact(item.text)
    const markerNote = redactionMarkerNote(redactedText)
    const snippet = excerpt(redactedText, query, maxItemText)
    const text = redactedText.length > maxItemText
      ? `${snippet}${markerNote && !snippet.includes(markerNote) ? `\n${markerNote}` : ""}\n\n… excerpted by recall_bus (${redactedText.length} chars redacted text)`
      : redactedText
    const block = `## ${item.source} (score ${item.score})\n\n${text}\n\n`
    if (used + block.length > safeBudget) {
      omitted++
      continue
    }
    lines.push(block.trimEnd(), "")
    used += block.length
    rendered++
  }
  if (ranked.length === 0) lines.push("No ranked recall hits. Try a narrower or more literal query.")
  else if (rendered === 0) lines.push("Ranked recall hits existed, but none fit the requested budget.")
  else if (omitted > 0 && used + 80 < safeBudget) lines.push(`_Omitted ${omitted} ranked hit(s) that did not fit the budget._`)
  return lines.join("\n")
}

function redactionMarkerNote(text) {
  const markers = [...new Set(String(text).match(/# recall_bus redacted:[a-z-]+/g) || [])]
  return markers.join("; ")
}
