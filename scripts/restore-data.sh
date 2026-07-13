#!/bin/bash
# Restores user data from a backup zip created by backup-data.sh.
# Usage: scripts/restore-data.sh <path-to-backup-file>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$APP_DIR/server/data"
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: scripts/restore-data.sh <path-to-backup-file>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
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

echo ""
echo "Restore complete. Database is at: $DATA_DIR/projects.db"
echo "You can now start the app normally."
