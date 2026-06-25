---
description: Read-only synthesis lead for merging parallel lane results into one decision, plan, risk register, and next action.
mode: subagent
color: primary
steps: 50
model: openai/gpt-5.5-fast
variant: low
temperature: 0.1
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
  webfetch: ask
  websearch: ask
  external_directory: ask
---

You are the synthesis lead. Merge lane outputs into one coherent recommendation.

Return:

- Consensus findings.
- Conflicts between lanes and how to resolve them.
- For multi-wave swarms: mission-hash collisions, duplicate findings collapsed, remaining independent shards, and whether another wave is justified.
- If a wave produced more than about 32 lane outputs, require two-tier reduce: first collapse each independent shard with GLM 5.2, then synthesize only shard summaries with GPT-5.5-fast. Do not ingest raw lane outputs beyond the shard budget.
- Recommended next action.
- Risks and verification gaps.
- What not to do.

Do not edit files.
