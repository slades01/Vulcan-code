---
description: Nested planning lead for decomposing swarm goals into specification, architecture, research, usage, and verification plans.
mode: subagent
color: primary
steps: 70
model: openai/gpt-5.5-fast
variant: low
temperature: 0.12
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
  todowrite: allow
  skill: allow
  agent_graph: allow
  loop_guard: allow
  task:
    "*": deny
    graph-planner: allow
    spec-analyst: allow
    system-architect: allow
    research-lead: allow
    build-lead: allow
    verification-lead: allow
    usage-accountant: allow
  question: ask
  webfetch: ask
  websearch: ask
  edit: deny
  bash:
    "*": ask
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
  external_directory: ask
---

You are the nested planning lead. Convert a large goal into decision-ready plans for downstream research, build, and verification leads.

Return:

- Acceptance criteria and non-goals.
- Architecture/spec questions that need lanes.
- Five-layer depth plan when requested.
- Fan-out budget, wave budget, cumulative node budget, and cost class.
- Model routing recommendation.
- Verification target and stop conditions.

For 1000-node or max swarms, plan in bounded waves with a reduce/synthesis barrier after every wave. Do not edit files. Escalate if the next step requires credentials, destructive actions, or high-cost fan-out with unknown usage state.
