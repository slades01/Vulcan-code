# Quickstart

## 1. Prerequisites

- Node.js + npm (needed to install and run the `vulcan` launcher, and to type-check
  the TypeScript plugins/tools).
- A supported OS/CPU: Windows, macOS, or Linux on x64/arm64 (inherited from the
  `opencode-ai` runtime).
- At least one provider API key exported in your environment.

## 2. Install the `vulcan` command

```bash
# from the GitHub repo (recommended for friends):
npm install -g github:slades01/Vulcan-code

# or from a local clone:
npm install -g .
```

This installs the `vulcan` launcher plus the `opencode-ai` runtime as a
dependency (no machine-specific paths). Confirm it works:

```bash
vulcan --version        # prints the VulcanCode version (e.g. "VulcanCode 1.0")
```

> Tip: point `vulcan` at a custom runtime build with
> `VULCAN_RUNTIME=/path/to/opencode vulcan ...` (macOS/Linux), or on Windows
> PowerShell: `$env:VULCAN_RUNTIME='C:\path\to\opencode.exe'; vulcan ...`.

## 3. Copy the pieces you want

VulcanCode is a la carte. A minimal start:

```bash
# from your config dir (e.g. ~/.config/opencode)
cp -r /path/to/Vulcan-code/agent/orchestrator.md agent/
cp -r /path/to/Vulcan-code/command/loop.md command/
cp -r /path/to/Vulcan-code/skills/bounded-agent-loops skills/
```

## 4. Configure

```bash
cp /path/to/Vulcan-code/config/opencode.example.jsonc opencode.jsonc
# edit opencode.jsonc, then export keys:
# set OPENAI_API_KEY in your shell
# set ZAI_API_KEY in your shell
```

## 5. (Optional) type-check TypeScript

```bash
npm install
npm run typecheck      # tsc --noEmit over plugins/** and tools/**
```

## 6. Smoke test

```bash
vulcan debug startup
vulcan debug config
vulcan debug agent orchestrator
```

If those pass, your setup is live. Try a bounded loop:

```
/loop --goal "..." --verification "..." --maxIterations 5
```

## Next

- [`permissions.md`](./permissions.md) — how the deny-by-default posture works.
- [`../bench/README.md`](../bench/README.md) — benchmark and Rung-2 spec gate.
