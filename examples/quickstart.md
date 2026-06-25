# Quickstart

## 1. Prerequisites

- [opencode](https://opencode.ai) installed; `opencode --version` reports `1.0.0-fast`.
- Node.js + npm (only needed if you want to type-check the TypeScript plugins/tools).
- At least one provider API key exported in your environment.

## 2. Copy the pieces you want

Vulcan-code is a la carte. A minimal start:

```bash
# from your opencode config dir (e.g. ~/.config/opencode)
cp -r /path/to/Vulcan-code/agent/orchestrator.md agent/
cp -r /path/to/Vulcan-code/command/loop.md command/
cp -r /path/to/Vulcan-code/skills/bounded-agent-loops skills/
```

## 3. Configure

```bash
cp /path/to/Vulcan-code/config/opencode.example.jsonc opencode.jsonc
# edit opencode.jsonc, then export keys:
# set OPENAI_API_KEY in your shell
# set ZAI_API_TOKEN in your shell
```

## 4. (Optional) type-check TypeScript

```bash
npm install
npm run typecheck      # tsc --noEmit over plugins/** and tools/**
```

## 5. Smoke test

```bash
opencode debug startup
opencode debug config
opencode debug agent orchestrator
```

If those pass, your setup is live. Try a bounded loop:

```
/loop --goal "..." --verification "..." --maxIterations 5
```

## Next

- [`permissions.md`](./permissions.md) — how the deny-by-default posture works.
- [`../bench/README.md`](../bench/README.md) — benchmark and Rung-2 spec gate.
