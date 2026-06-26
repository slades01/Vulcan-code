# Patches

This directory holds **tracked patch artifacts** for changes that belong to
upstream runtime sources rather than to this repository. **Vulcan-code is a
configuration / launcher package** — it does not vendor the TUI runtime. The
`vulcan` command launches the [opencode](https://opencode.ai) runtime, and the
pixel-logo source lives in that runtime at `packages/tui/src/logo.ts`.

Patches are kept here so a change to runtime-owned source is represented,
reviewable, and reproducible from this repo.

## `opencode/vulcan-wordmark-logo.patch`

A minimal, `git apply`-able unified diff against the opencode runtime that fixes
the bottom row of the **Vulcan** pixel wordmark shown in the TUI splash and CLI
banner. The `l` and `a` cells previously rendered with a broken underline.
Concretely, in `packages/tui/src/logo.ts`, `logo.left[3]` changes from:

    " ▀▀  ▀▀▀▀ ▀    ▀▀▀▀ ▀▀▀▀ ▀~~▀"

to:

    " ▀▀  ▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀  ▀ ▀~~▀"

### Apply

From a checkout of the opencode runtime source:

```bash
git apply /path/to/Vulcan-code/patches/opencode/vulcan-wordmark-logo.patch
```

Then rebuild the runtime (follow the opencode repo's build instructions for the
`tui`/`opencode` packages) and relaunch `vulcan` to see the corrected wordmark.

### Notes

- The patch is LF-terminated and validates cleanly under the default Windows
  setup (`core.autocrlf=true`, CRLF working tree) as well as Linux/macOS
  (`core.autocrlf=false` / `input`, LF working tree).
- It carries the full `logo.left` array as context, so it locates the correct
  line even if surrounding lines shift slightly.
- Upstream status: the opencode `dev` checkout this patch was validated against
  **already contains the corrected glyph**, so on such a checkout `git apply`
  will report the change is already present (nothing to do). The artifact is
  retained here for traceability and for any runtime checkout that still has the
  earlier glyph.
