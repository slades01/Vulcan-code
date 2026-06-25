import type { Plugin } from "@opencode-ai/plugin"

const ALLOW = "allow" as const
const DENY = "deny" as const

// Sensitive file/path patterns. A read/edit/external_directory touching one of
// these is denied immediately rather than surfaced as an approval prompt.
const sensitivePatterns = [
  /(^|[\\/])\.env(\.|$)/i,
  /(^|[\\/])\.ssh([\\/]|$)/i,
  /(^|[\\/])\.gnupg([\\/]|$)/i,
  /id_rsa/i,
  /id_ed25519/i,
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /credential/i,
  /(^|[\\/])\.aws([\\/]|$)/i,
  /(^|[\\/])\.azure([\\/]|$)/i,
  /(^|[\\/])\.config[\\/]gcloud([\\/]|$)/i,
  /(^|[\\/])\.npmrc$/i,
  /(^|[\\/])\.pypirc$/i,
  /(^|[\\/])\.netrc$/i,
  /(^|[\\/])\.docker[\\/]config\.json$/i,
  /(^|[\\/])\.kube[\\/]config$/i,
  /Google[\\/]Chrome[\\/]User Data/i,
  /Microsoft[\\/]Edge[\\/]User Data/i,
  /Mozilla[\\/]Firefox[\\/]Profiles/i,
  /service[-_]?account/i,
  /token/i,
  /secret/i,
]

// Destructive command shapes. Any ONE segment of a command matching one of these
// denies the whole command. This replaces the old /[;&|<>`]/ character-class
// blacklist, which denied the PowerShell chaining idioms the agent is told to
// use and caused a deny->reformat->retry cycle on nearly every shell step.
const destructivePatterns = [
  // file / directory deletion
  /\brm\s+/i,
  /\brmdir\s+/i,
  /\bdel\s+/i,
  /\berase\b/i,
  /\bRemove-Item\b/i,
  /\bfs\.(rm|unlink|rmdir)\b/i,
  /\bos\.remove\b/i,
  /\bshutil\.rmtree\b/i,
  // git history / working-tree destruction
  /\bgit\s+clean\b/i,
  /\bgit\s+reset\s+--hard\b/i,
  /\bgit\s+checkout\s+--\b/i,
  /\bgit\s+restore\b/i,
  /\bgit\s+push\b[^\n]*(-f\b|--force\b)/i,
  // package publishing
  /\b(npm|pnpm|yarn)\s+publish\b/i,
  // secret infrastructure
  /\bgh\s+secret\b/i,
  // high-power content mutation cmdlets
  /\bSet-Content\b/i,
  /\bAdd-Content\b/i,
  /\bClear-Content\b/i,
  /\bSet-Item\b/i,
  /\bMove-Item\b/i,
  /\bRename-Item\b/i,
  /\bClear-Item\b/i,
  // expression evaluators that commonly execute untrusted remote payloads
  /\bInvoke-Expression\b/i,
  // remote-script fetch-and-execute
  /\b(curl|wget|iwr|Invoke-WebRequest)\b[^\n]*\|\s*(sh|bash|pwsh|powershell|iex|Invoke-Expression)\b/i,
  /\b(curl|wget|iwr|Invoke-WebRequest)\b[^\n]*--output[^\n]*\.(sh|ps1|bat|cmd|exe)\b/i,
  // disk/format level
  /\bformat\s+/i,
  /\bdiskpart\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
]

const permissionText = (input: any) => {
  const pattern = Array.isArray(input.pattern) ? input.pattern.join(" ") : input.pattern ?? ""
  return [input.type, input.title, pattern, JSON.stringify(input.metadata ?? {})].join(" ")
}

const isSensitivePath = (text: string) => {
  const globStripped = text.replace(/[*?"']/g, "")
  return sensitivePatterns.some((p) => p.test(text) || p.test(globStripped))
}

// Split a shell command into its individual statements/pipeline stages so a
// destructive segment hidden after a `;` or `|` is still caught. PowerShell 5.1
// uses `;` for statement separation, `|` for pipes, and newlines for both.
// Background `&` (trailing) is also split; leading `&` (call operator) is left
// intact so `& "C:\path\npm.cmd" test` still works.
const splitShellSegments = (text: string): string[] => {
  const segs = text
    .split(/[;\r\n|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  // also split trailing background `&` forms like "cmd &" or "cmd & other"
  const expanded: string[] = []
  for (const s of segs) {
    const parts = s.split(/\s&\s|\s&$/).map((p) => p.trim()).filter((p) => p.length > 0)
    expanded.push(...parts)
  }
  return expanded
}

const isDestructiveBash = (text: string): boolean => {
  // First check the raw text for command-substitution sinks the splitter may miss.
  if (/\$\([^)]*\b(rm|Remove-Item|git\s+reset|git\s+clean|git\s+restore|iex|Invoke-Expression|Set-Content)\b/i.test(text)) {
    return true
  }
  // Then check each statement/pipeline segment independently.
  const segments = splitShellSegments(text)
  for (const seg of segments) {
    if (destructivePatterns.some((p) => p.test(seg))) return true
  }
  return false
}

const shouldDeny = (input: any): boolean => {
  const text = permissionText(input)
  if (input.type === "bash") return isDestructiveBash(text)
  if (
    (input.type === "read" || input.type === "edit" || input.type === "external_directory") &&
    isSensitivePath(text)
  ) {
    return true
  }
  return false
}

const isPermissionAction = (value: unknown): value is "ask" | "allow" | "deny" =>
  value === "ask" || value === ALLOW || value === DENY

const safePathRule = () => ({
  "*": ALLOW,
  "*.env": DENY,
  "*.env.*": DENY,
  "**/.env": DENY,
  "**/.env.*": DENY,
  "**/.ssh/**": DENY,
  "**/.aws/**": DENY,
  "**/.azure/**": DENY,
  "**/.config/gcloud/**": DENY,
  "*id_rsa*": DENY,
  "*id_ed25519*": DENY,
  "*credentials*": DENY,
  "*.npmrc": DENY,
  "*.pypirc": DENY,
  "*.netrc": DENY,
  "**/.docker/config.json": DENY,
  "**/.kube/config": DENY,
  "*.pem": DENY,
  "*.key": DENY,
  "*.p12": DENY,
  "*.pfx": DENY,
  "**/.gnupg/**": DENY,
  "*service-account*.json": DENY,
  "*service_account*.json": DENY,
  "**/Google/Chrome/User Data/**": DENY,
  "**/Microsoft/Edge/User Data/**": DENY,
  "**/Mozilla/Firefox/Profiles/**": DENY,
  "*token*": DENY,
  "*secret*": DENY,
})

const isPathPermissionTool = (tool: string) =>
  tool === "read" || tool === "edit" || tool === "external_directory"

const normalizePermissionRule = (tool: string, rule: any): any => {
  if (rule === "ask") return isPathPermissionTool(tool) ? safePathRule() : ALLOW
  if (rule === ALLOW || rule === DENY) return rule
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) return rule

  for (const [pattern, action] of Object.entries(rule)) {
    if (!isPermissionAction(action)) continue
    if (action !== "ask") continue
    rule[pattern] =
      isPathPermissionTool(tool) && isSensitivePath(pattern)
        ? DENY
        : ALLOW
  }
  return rule
}

const normalizePermissionConfig = (permission: any) => {
  if (!permission || typeof permission !== "object" || Array.isArray(permission)) return
  for (const [tool, rule] of Object.entries(permission)) {
    permission[tool] = normalizePermissionRule(tool, rule)
  }
}

const normalizeConfigPermissions = (cfg: any) => {
  normalizePermissionConfig(cfg.permission)
  for (const agent of Object.values(cfg.agent ?? {}) as any[]) {
    normalizePermissionConfig(agent?.permission)
  }
  // `mode` is deprecated but still accepted; normalize it as a guard for older
  // project configs that may be merged into the active config.
  for (const mode of Object.values(cfg.mode ?? {}) as any[]) {
    normalizePermissionConfig(mode?.permission)
  }
}

// Trusted max-autonomy mode: never surface an approval prompt to the user.
// There is intentionally no path that returns `ask` from this plugin. A
// subagent's permission request is resolved here before the TUI approval UI can
// appear: safe/routine actions (including legitimate PowerShell chaining) are
// allowed immediately; credential-like reads/edits, sensitive external
// directories, and genuinely destructive shell shapes (per-segment) are denied
// immediately. Denied actions are returned to the requesting agent as tool
// failures so it can escalate to its parent/orchestrator in text, not to the
// user through an approval prompt.
const trustedAutonomy: Plugin = async () => {
  return {
    config: async (cfg) => {
      normalizeConfigPermissions(cfg)
    },
    "permission.ask": async (_input, output) => {
      output.status = shouldDeny(_input) ? DENY : ALLOW
    },
  }
}

export default trustedAutonomy
