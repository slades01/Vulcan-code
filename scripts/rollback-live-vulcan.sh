#!/usr/bin/env bash
set -euo pipefail

# Roll back live OpenCode config assets from a deploy backup.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LIVE_CONFIG="${VULCAN_LIVE_CONFIG:-${HOME}/.config/opencode}"
BACKUP_ROOT="${VULCAN_BACKUP_ROOT:-${HOME}/.config/opencode/backups/local-to-live}"
ASSETS=(agent command skills plugins tools)

if [[ $# -gt 1 ]]; then
  echo "Usage: $0 [backup-dir]" >&2
  exit 2
fi

if [[ $# -eq 1 ]]; then
  BACKUP_DIR="$1"
else
  BACKUP_DIR="$(ls -1dt "${BACKUP_ROOT}"/* 2>/dev/null | head -n 1 || true)"
fi

if [[ -z "${BACKUP_DIR}" || ! -d "${BACKUP_DIR}" ]]; then
  echo "No rollback backup found under ${BACKUP_ROOT}" >&2
  exit 1
fi

echo "Live config: ${LIVE_CONFIG}"
echo "Backup:      ${BACKUP_DIR}"

for asset in "${ASSETS[@]}"; do
  if [[ -d "${BACKUP_DIR}/${asset}" ]]; then
    rm -rf "${LIVE_CONFIG:?}/${asset}"
    mkdir -p "${LIVE_CONFIG}/${asset}"
    rsync -a "${BACKUP_DIR}/${asset}/" "${LIVE_CONFIG}/${asset}/"
  else
    rm -rf "${LIVE_CONFIG:?}/${asset}"
  fi
done

echo "== Verifying rolled-back live Vulcan =="
"${SCRIPT_DIR}/verify-live-vulcan.sh"

echo "== Rollback complete =="
echo "Restart Vulcan/OpenCode sessions to load config-time changes."
