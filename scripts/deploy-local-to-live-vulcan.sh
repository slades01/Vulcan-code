#!/usr/bin/env bash
set -euo pipefail

# Deploy approved local VulcanCode source assets to the live OpenCode config.
# This intentionally avoids symlinks: branch switching and half-edits in local source
# do not affect live config until this script is run.

DRY_RUN=0
SKIP_VERIFY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-verify) SKIP_VERIFY=1 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_SOURCE="${VULCAN_LOCAL_SOURCE:-$(cd -- "${SCRIPT_DIR}/.." && pwd)}"
LIVE_CONFIG="${VULCAN_LIVE_CONFIG:-${HOME}/.config/opencode}"
BACKUP_ROOT="${VULCAN_BACKUP_ROOT:-${HOME}/.config/opencode/backups/local-to-live}"
ASSETS=(agent command skills plugins tools)
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${STAMP}"

echo "Local source: ${LOCAL_SOURCE}"
echo "Live config:  ${LIVE_CONFIG}"

for asset in "${ASSETS[@]}"; do
  if [[ ! -d "${LOCAL_SOURCE}/${asset}" ]]; then
    echo "Missing local asset directory: ${LOCAL_SOURCE}/${asset}" >&2
    exit 1
  fi
done

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "== Dry run: local -> live asset sync preview =="
  for asset in "${ASSETS[@]}"; do
    echo "-- ${asset} --"
    rsync -acin --delete "${LOCAL_SOURCE}/${asset}/" "${LIVE_CONFIG}/${asset}/"
  done
  exit 0
fi

echo "== Backing up current live config assets =="
mkdir -p "${BACKUP_DIR}"
for asset in "${ASSETS[@]}"; do
  if [[ -e "${LIVE_CONFIG}/${asset}" ]]; then
    mkdir -p "${BACKUP_DIR}"
    rsync -a "${LIVE_CONFIG}/${asset}" "${BACKUP_DIR}/"
  fi
done
cat > "${BACKUP_DIR}/MANIFEST.txt" <<EOF
backup_created=${STAMP}
local_source=${LOCAL_SOURCE}
live_config=${LIVE_CONFIG}
assets=${ASSETS[*]}
restore_with=${LOCAL_SOURCE}/scripts/rollback-live-vulcan.sh ${BACKUP_DIR}
EOF
echo "Backup: ${BACKUP_DIR}"

echo "== Deploying local source assets to live config =="
mkdir -p "${LIVE_CONFIG}"
for asset in "${ASSETS[@]}"; do
  mkdir -p "${LIVE_CONFIG}/${asset}"
  rsync -a --checksum --delete "${LOCAL_SOURCE}/${asset}/" "${LIVE_CONFIG}/${asset}/"
done

echo "== Comparing local source and live config =="
"${SCRIPT_DIR}/compare-local-live-vulcan.sh"

if [[ "$SKIP_VERIFY" -eq 0 ]]; then
  echo "== Verifying live Vulcan =="
  "${SCRIPT_DIR}/verify-live-vulcan.sh"
else
  echo "Skipped live verification (--skip-verify). Restart Vulcan before relying on config-time changes."
fi

echo "== Deploy complete =="
echo "Restart Vulcan/OpenCode sessions to load config-time changes."
