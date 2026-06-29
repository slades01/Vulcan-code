#!/usr/bin/env bash
set -euo pipefail

# Compare the editable local VulcanCode source with the live OpenCode config.
# Local source is safe to branch/edit. Live config is what `vulcan` loads globally.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_SOURCE="${VULCAN_LOCAL_SOURCE:-$(cd -- "${SCRIPT_DIR}/.." && pwd)}"
LIVE_CONFIG="${VULCAN_LIVE_CONFIG:-${HOME}/.config/opencode}"

python3 - "$LOCAL_SOURCE" "$LIVE_CONFIG" <<'PY'
from pathlib import Path
import filecmp
import sys

local = Path(sys.argv[1]).expanduser().resolve()
live = Path(sys.argv[2]).expanduser().resolve()
roots = ["agent", "command", "skills", "plugins", "tools"]

print(f"Local source: {local}")
print(f"Live config:  {live}")

failed = False
for root in roots:
    lp = local / root
    vp = live / root
    local_files = {p.relative_to(lp) for p in lp.rglob("*") if p.is_file()} if lp.exists() else set()
    live_files = {p.relative_to(vp) for p in vp.rglob("*") if p.is_file()} if vp.exists() else set()
    only_local = sorted(local_files - live_files)
    only_live = sorted(live_files - local_files)
    diff = [rel for rel in sorted(local_files & live_files) if not filecmp.cmp(lp / rel, vp / rel, shallow=False)]
    if only_local or only_live or diff:
        failed = True
        print(f"\n## {root}")
        for rel in only_local:
            print(f"only-local {rel}")
        for rel in only_live:
            print(f"only-live  {rel}")
        for rel in diff:
            print(f"diff       {rel}")

if failed:
    print("\nDRIFT: local source and live config differ.")
    sys.exit(1)

print("\nMATCH: local source assets and live config assets are identical.")
PY
