---
name: laptop-research-workhorse
description: CURRENTLY UNAVAILABLE: use only to recover/check the RTX laptop research workhorse; do not route normal research through it.
---

# Laptop Research Workhorse

The laptop research workhorse is currently **unavailable / under development**. Do not route normal web/docs research through the RTX laptop, `laptop-gemma/workhorse:*`, or `http://LAPTOP_HOST:8765/*` until health and direct provider checks pass again.

Use this skill only for recovery checks or handoff context. For normal research, use Context7, gh_grep, webfetch, or the default model routes.

## Recovery health gate (run from the desktop)

The single source of truth for desktop-origin health is the fail-fast gate script. It is hard-bounded (`curl.exe` `--connect-timeout` / `--max-time`) so a dead/zombie endpoint fails in seconds instead of hanging for minutes, and it does **not** use `Test-NetConnection` as a required gate:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ~\vulcan-workhorse\laptop_workhorse_health.ps1 `
  -Stage ALL
```

Stages: **T0** = direct `/v1/chat/completions` tiny prompt (`:11434/v1`); **T1** = wrapper `/health` model/num_ctx validation (`model=workhorse:3b`, `num_ctx=32768`); **T2** = sustained repeated tiny direct chats (default 5 reps, fail-fast). `-Stage ALL` requires ALL/T2 to pass — this is the exact mode that collapsed under sustained generation last session. It emits a JSON-ish summary and exits nonzero on any failure. Treat the historical notes below as valid only after `ALL` passes.

## Routing rule

- Do **not** prefer the laptop worker endpoint while unavailable.
- Use local/default research tools unless the task is explicitly to recover or test the laptop worker.
- Treat previous benchmark/model notes below as historical until the recovery health gate (`laptop_workhorse_health.ps1 -Stage ALL`) passes.
- **Optimization note (2026-06):** the optimized `workhorse:3b` (granite4.1:3b Q4, with `flash_attention` + KV-cache `q8_0` enabled at the Ollama **server** level and a 32k context window) is now the active model on **both** paths — the direct provider (`laptop-gemma/workhorse:3b`) and the `:8765` research wrapper (`model=workhorse:3b`, `num_ctx=32768`, `num_predict=768`). It is ~1.3-1.9x faster decode and materially better extraction than the legacy `gemma3:4b`. Both paths are valid; the direct provider just saves one HTTP hop. Note: `flash_attention`/`cache_type_*` are server-side and invalid as per-request `options` in this Ollama build — do not pass them in request bodies.

## PowerShell examples

Research through the laptop is disabled while unavailable. Historical command shape, for recovery only after the gate (`laptop_workhorse_health.ps1 -Stage ALL`) passes:

```powershell
$body = @{
  url = "https://example.com"
  query = "Extract setup steps, commands, config keys, caveats, and quotes."
  max_chars = 120000
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri "http://LAPTOP_HOST:8765/research" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

Fetch cleaned text only through the laptop:

```powershell
$body = @{ url = "https://example.com"; max_chars = 20000 } | ConvertTo-Json
Invoke-RestMethod -Uri "http://LAPTOP_HOST:8765/fetch" -Method Post -ContentType "application/json" -Body $body
```

Health check (use the gate script, not a bare curl):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass `
  -File ~\vulcan-workhorse\laptop_workhorse_health.ps1 `
  -Stage ALL
```

## Direct model provider

OpenCode provider/model (registered but currently unavailable):

```text
laptop-gemma/workhorse:3b     # granite4.1:3b Q4, flash_attention + KV-cache q8_0 (server-side), num_ctx 32768
laptop-gemma/workhorse:8b     # granite4.1:8b Q4, num_ctx 8192 — max-intelligence / slower
```

Do not use these models for active tasks while unavailable. After recovery, use `workhorse:3b` for summarization/extraction (fast + thorough), and `workhorse:8b` only when extraction difficulty justifies the speed cost. Avoid `gemma4:*` through `/api/generate` — they are chat/reasoning models that emit an empty `.response` on the generate endpoint.

## Wrapper status (currently unavailable)

Historical last-known-good state: both paths ran `workhorse:3b` + `num_ctx=32768` + `num_predict=768`:

- `:8765` research wrapper — `model=workhorse:3b` (verify via `/health`).
- direct provider — `laptop-gemma/workhorse:3b`.

All acceleration tuning is server-side: `flash_attention` and KV-cache `q8_0` are enabled through the Ollama server env / baked into the `workhorse:3b` tag. Do **not** add `flash_attention` or `cache_type_*` to per-request `options` — this Ollama build rejects them. To mark it available again: run `laptop_workhorse_health.ps1 -Stage ALL` from the desktop (must exit `0`, `overall_ok=true`, which implies `model=workhorse:3b` + `num_ctx=32768` + sustained T2 chats pass), then a fail-fast 1-rep `benchmark_vulcan_workhorse.py --reps 1 --stop-on-failure`, then only after both pass flip the 4 seams in lockstep (see command `laptop-research.md` and `WORKHORSE_HANDOFF.md`).

## Benchmark reference (desktop-host -> laptop-host, 2026-06-23)

| model | decode tok/s | extraction | notes |
|---|---|---|---|
| gemma3:4b (legacy) | ~79 | 4/8 | legacy wrapper default — weakest |
| **workhorse:3b** | **104-146** | **7/8** | **primary** — faster + smarter |
| granite4.1:3b-q8_0 | ~82 | 8/8 | alt if perfect completeness needed |
| workhorse:8b | 45-78 | 7-8/8 | max intelligence, ctx capped 8192 |
| qwen3:4b-instruct-2507-q8_0 | ~52 | 8/8 | smartest 4B, slower |
| gemma4:e2b | ~116 | n/a | empty via /api/generate — do not use |
