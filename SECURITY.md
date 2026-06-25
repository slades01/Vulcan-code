# Security Policy

## Supported versions

Only the latest tagged release on `main` is supported (currently `v1.0.0-fast`).

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.** Instead, please use
**GitHub Security Advisories** ("Report a vulnerability" on the repo's Security tab) or
email the maintainer privately. Include reproduction steps and, if applicable, the affected
file path. You will receive an acknowledgment within a reasonable timeframe.

## What this package is

VulcanCode is a **configuration** package launched via the `vulcan` command (built on the
[opencode](https://opencode.ai) runtime). It contains agent prompts, commands, skills,
TypeScript plugins/tools, and example configs. It is sanitized: no credentials, API keys, SSH
material, billing data, private hostnames, or local absolute paths are shipped (see the
verification section of `README.md`).

## Built-in defenses

This package is intentionally **deny-by-default**:

- **Agent permission frontmatter** denies reads of credential-like paths:
  `**/.ssh/**`, `*id_rsa*`, `*id_ed25519*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`,
  `**/.aws/**`, `**/.azure/**`, `**/.config/gcloud/**`, `**/.gnupg/**`, `*credentials*`,
  `*.npmrc`, `*.pypirc`, `*.netrc`, `**/.docker/config.json`, `**/.kube/config`,
  service-account JSON, browser user-data/profile dirs, and broad `*token*` / `*secret*` globs.
- **`plugins/trusted-autonomy.ts`** upgrades permissive `ask` rules to `deny` for sensitive
  paths and blocks destructive shell shapes (per statement/pipeline segment): deletions,
  `git reset --hard`, `git clean`, `git checkout --`, `git push --force`, `npm publish`,
  `gh secret`, content-mutation cmdlets, `Invoke-Expression`, remote fetch-and-execute pipes,
  `format`, `diskpart`, `mkfs`, `dd`.
- `opencode.jsonc` (the real, key-bearing config) is gitignored. Only
  `config/opencode.example.jsonc` (placeholders via `{env:...}`) is committed.

### Note on the `ed25519` string

A literal scan for `ed25519` returns hits in this repo. **Every occurrence is a defensive
deny-rule** — either `"*id_ed25519*": deny` in agent frontmatter or the `/id_ed25519/i`
regex in `plugins/trusted-autonomy.ts`. These rules **prevent** VulcanCode from reading SSH
private keys; they contain **no key material**. A pattern that denies `id_ed25519` files
cannot match them without the literal substring, so this is an intentional, safe residual.

## Hardening your own setup

- Keep `opencode.jsonc` gitignored and load provider keys from the environment with
  `{env:YOUR_PROVIDER_KEY}`.
- Prefer copying the `trusted-autonomy` plugin so `ask` never silently becomes `allow` for
  sensitive paths.
- Review agent permission frontmatter before enabling max-autonomy modes.
