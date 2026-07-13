#!/bin/bash
# Backs up user data to a timestamped zip file you can copy to your new PC.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
DB_FILE="$APP_DIR/server/data/projects.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$APP_DIR/study-app-backup_$TIMESTAMP.zip"

if [ ! -f "$DB_FILE" ]; then
  echo "ERROR: Database not found at $DB_FILE"
  exit 1
fi

zip -j "$BACKUP_FILE" "$DB_FILE"

echo ""
echo "Backup created: $BACKUP_FILE"
echo ""
echo "Copy this file to your new PC, then run:"
echo "  scripts/restore-data.sh <path-to-backup-file>"
