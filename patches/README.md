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

## `opencode/vulcan-tui-rebrand.patch`

A `git apply`-able unified diff against the opencode runtime that rebrands every
user-facing **"OpenCode"** product-name string in the TUI to **"VulcanCode"**, so
the running app no longer shows the upstream brand. It covers:

- the session sidebar footer **and** its fallback (the bottom-right
  `• VulcanCode <version>`),
- the terminal window title for home/session/plugin routes (incl. the
  `OC |` → `VC |` short prefix),
- the permission prompts ("...until VulcanCode is restarted", "Tell VulcanCode
  what to do differently"),
- the first-run getting-started box ("VulcanCode includes free models..."),
- the rotating home tips, the attention sound-pack name, and the
  upgrade-complete dialog.

Files touched:

- `packages/tui/src/feature-plugins/sidebar/footer.tsx`
- `packages/tui/src/routes/session/sidebar.tsx`
- `packages/tui/src/app.tsx`
- `packages/tui/src/routes/session/permission.tsx`
- `packages/tui/src/feature-plugins/home/tips-view.tsx`
- `packages/tui/src/attention.ts`

The `<version>` segment is unchanged — it is the runtime's `InstallationVersion`
build define (set to `1.0.0` via `OPENCODE_VERSION` on the VulcanCode build).

### Apply

From a checkout of the opencode runtime source:

```bash
git apply /path/to/Vulcan-code/patches/opencode/vulcan-tui-rebrand.patch
```

Then rebuild the runtime (e.g. `OPENCODE_VERSION=1.0.0 bun run script/build.ts
--single --skip-install --skip-embed-web-ui` from `packages/opencode`) and
relaunch `vulcan`.

### Notes

- The patch is LF-terminated, UTF-8 (preserving the `•`/`✕` glyphs), and was
  generated from `git diff` over the six files above. It reverse-validates
  cleanly (`git apply -R --check`) on the live dev checkout.
- **Intentionally preserved** `OpenCode` strings: provider/product names
  ("OpenCode Zen", "OpenCode Go"), the `logo.ts` brand function (which returns
  "OpenCode" only for unbranded `opencode` builds), and CLI command tokens in the
  tips (e.g. `opencode run`, `opencode serve`).
- On the live dev checkout this patch was generated from, the changes are already
  present, so `git apply` will report nothing to do; the artifact is retained for
  traceability and for any checkout that still has the upstream literals.
- Includes and supersedes the earlier narrow `vulcan-sidebar-footer-brand.patch`.
  Apply **only** this comprehensive patch — the narrow one is retained but
  redundant and would conflict on `footer.tsx` if both were applied.
