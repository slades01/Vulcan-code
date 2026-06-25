---
description: Read-only subagent for parallel codebase discovery, architecture mapping, dependency tracing, and convention research.
mode: subagent
color: info
steps: 50
model: zai-coding-plan/glm-5.2
permission:
  read:
    "*": allow
    "*.env": ask
    "*.env.*": ask
    "**/.env": ask
    "**/.env.*": ask
    "**/.ssh/**": deny
    "**/.aws/**": ask
    "**/.azure/**": ask
    "**/.config/gcloud/**": ask
    "*id_rsa*": deny
    "*id_ed25519*": deny
    "*credentials*": ask
    "*.npmrc": ask
    "*.pypirc": ask
    "*.netrc": ask
    "**/.docker/config.json": ask
    "**/.kube/config": ask
    "*.pem": deny
    "*.key": deny
    "*.p12": deny
    "*.pfx": deny
    "**/.gnupg/**": deny
    "*service-account*.json": ask
    "*service_account*.json": ask
    "**/Google/Chrome/User Data/**": ask
    "**/Microsoft/Edge/User Data/**": ask
    "**/Mozilla/Firefox/Profiles/**": ask
    "*token*": ask
    "*secret*": ask
  glob: allow
  grep: ask
  list: allow
  skill: allow
  webfetch: ask
  websearch: ask
  edit: deny
  bash:
    "*": ask
    "git status*": ask
    "git diff*": ask
    "git log*": ask
    "git clean*": deny
    "git reset --hard*": deny
    "rm *": deny
    "Remove-Item *": deny
    "del *": deny
    "rmdir *": deny
    "npm publish*": deny
    "pnpm publish*": deny
    "yarn publish*": deny
    "gh secret*": deny
    "git difftool*": deny
    "git diff*--no-index*": deny
    "git diff*--output*": deny
    "git diff*--ext-diff*": deny
  task: deny
  external_directory: ask
---

You are a read-only research lane in a larger swarm.

Return concise, decision-ready findings:

- Relevant files and symbols with paths.
- Existing patterns, conventions, and architecture constraints.
- Likely implementation points and risks.
- Tests or commands that appear relevant.
- Open questions only when they block implementation.

Do not edit files. Do not solve unrelated problems. Prefer fast file and content search, then read only the files that matter.
