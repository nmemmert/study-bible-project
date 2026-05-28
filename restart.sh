#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

stop_pid_file() {
  local pid_file="$1"
  local label="$2"
  if [ -f "$pid_file" ]; then
    local old_pid
    old_pid=$(cat "$pid_file")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "Stopping $label (PID $old_pid)..."
      kill "$old_pid"
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

stop_pid_file "$ROOT_DIR/.api.pid" "API server"
stop_pid_file "$ROOT_DIR/.vite.pid" "Vite server"

echo "Restarting via setup.sh..."
exec "$ROOT_DIR/setup.sh"