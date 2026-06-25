---
description: CURRENTLY UNAVAILABLE: laptop research workhorse is under development; use local/default research routes instead.
---

The RTX laptop workhorse is currently **unavailable / under development**. Do not route active research to `http://LAPTOP_HOST:8765/*` or `laptop-gemma/workhorse:*` until health and direct provider checks pass again.

Use local/default research routes instead: Context7 for library docs, gh_grep for public code examples, `webfetch` for ordinary URL fetches, or normal model summarization over already-provided source text.

## Recovery health gate (run from the desktop)

Before any enable is even considered, the desktop-origin health gate must pass. It is fail-fast and hard-bounded so it cannot hang:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ~\opencode-workhorse\laptop_workhorse_health.ps1 `
  -Stage ALL
```

It must exit `0` with `overall_ok=true`. `ALL` implies `T2` (sustained repeated tiny direct chats) passes — this is the exact failure mode that collapsed under sustained generation last session. A quick single-stage smoke (expected to fail fast while the host is down):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ~\opencode-workhorse\laptop_workhorse_health.ps1 `
  -Stage T0 -TimeoutSec 2
```

The gate does **not** use `Test-NetConnection` as a required gate (TCP-only is not health).

## Enable contract — do NOT skip steps

Re-enabling is only allowed after, in order:

1. **`-Stage ALL` passes from the desktop** (exit 0, `overall_ok=true`, i.e. ALL/T2 pass).
2. **A fail-fast 1-rep benchmark** passes:

   ```powershell
   python ~\opencode-workhorse\benchmark_opencode_workhorse.py `
     --ollama http://LAPTOP_HOST:11434 --models workhorse:3b `
     --mode generate --reps 1 --warmup 1 `
     --num-ctx 32768 --num-predict 768 --num-batch 4096 `
     --stop-on-failure --timeout 120
   ```

3. **Only then**, flip the **4 seams in lockstep** (do not leave a half-enabled state):
   - **Seam 1** — `agent.laptop-researcher.disable`: `true` → `false`.
   - **Seam 2** — `agent.laptop-researcher.prompt` + `description`: remove the "currently unavailable / do not route" directives.
   - **Seam 3** — `provider.laptop-gemma.name`: drop the "— currently unavailable" suffix.
   - **Seam 4** — this command file **and** `skills/laptop-research-workhorse/SKILL.md`: flip the "CURRENTLY UNAVAILABLE" frontmatter/routing banners to available.

Do **not** flip any seam until steps 1 and 2 both pass. Do not run the wrapper for normal tasks while unavailable. If explicitly performing recovery diagnostics, run only the health gate first and stop if it times out or fails.
