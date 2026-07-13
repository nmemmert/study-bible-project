#!/bin/bash
# Restores user data from a backup zip created by backup-data.sh.
#
# Development usage:
#   npm run restore <path-to-backup-file>
#
# Production usage (restores into the running service directory):
#   sudo bash scripts/restore-data.sh <path-to-backup-file> --production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_FILE="$1"
MODE="${2:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: scripts/restore-data.sh <path-to-backup-file> [--production]"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ "$MODE" = "--production" ]; then
  DATA_DIR="/opt/study-app/server/data"
  SERVICE_USER="study-app"
  if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Production restore must be run as root (sudo)."
    exit 1
  fi
else
  DATA_DIR="$APP_DIR/server/data"
  SERVICE_USER=""
fi

mkdir -p "$DATA_DIR"

# Warn if a database already exists
if [ -f "$DATA_DIR/projects.db" ]; then
  echo "WARNING: An existing database was found at $DATA_DIR/projects.db"
  read -p "Overwrite it? (y/N): " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Restore cancelled."
    exit 0
  fi
  cp "$DATA_DIR/projects.db" "$DATA_DIR/projects.db.bak"
  echo "Old database backed up to projects.db.bak"
fi

unzip -o "$BACKUP_FILE" -d "$DATA_DIR"

if [ -n "$SERVICE_USER" ]; then
  chown "$SERVICE_USER":"$SERVICE_USER" "$DATA_DIR/projects.db"
  echo "Restarting study-app service..."
  systemctl restart study-app
fi

echo ""
echo "Restore complete. Database is at: $DATA_DIR/projects.db"
if [ "$MODE" = "--production" ]; then
  echo "Check service status: systemctl status study-app"
else
  echo "You can now start the app normally."
fi
