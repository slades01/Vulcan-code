# Permissions walk-through

Vulcan-code is **deny-by-default**. There are three layers.

## 1. Agent frontmatter

Each agent in `agent/` declares a `permission:` block. Reads of credential-like paths are
denied outright, e.g.:

```yaml
permission:
  read:
    "*": allow
    "**/.ssh/**": deny
    "*id_rsa*": deny
    "*id_ed25519*": deny     # defensive: denies SSH keys (contains the literal by necessity)
    "*.pem": deny
    "*.key": deny
    "*credentials*": ask
    "**/.aws/**": ask
```

`ask` means "prompt the user"; `deny` means "refuse and return a tool failure".

## 2. trusted-autonomy plugin

`plugins/trusted-autonomy.ts` runs at config load and on every `permission.ask`. It:

- Converts any `ask` rule whose pattern matches a sensitive path into a `deny`.
- Splits shell commands by `;`, `|`, newlines, and trailing `&`, then denies the whole
  command if **any** segment matches a destructive shape (deletions, `git reset --hard`,
  `git clean`, force-push, `npm publish`, `gh secret`, `Invoke-Expression`, remote
  fetch-and-execute pipes, `format`/`diskpart`/`mkfs`/`dd`, content-mutation cmdlets).

This lets legitimate PowerShell chaining (`cmd1; if ($?) { cmd2 }`) through while still
blocking a destructive command hidden after a separator.

## 3. Gitignore

`opencode.jsonc` (your real, key-bearing config) is gitignored. Only
`config/opencode.example.jsonc` is committed, and it uses `{env:...}` placeholders.

## Why `ed25519` appears in scans

The only blocked-pattern residual in this repo is the literal `ed25519`, and every
occurrence is a `"*id_ed25519*": deny` rule or the `/id_ed25519/i` deny-regex — i.e. the
rules that **stop** opencode reading your keys. They contain no key material; the literal is
required to match the filename. See `SECURITY.md`.
