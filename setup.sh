#!/usr/bin/env bash
set -euo pipefail

PREFERRED_VITE_PORT=5173
MAX_VITE_PORT=5200
API_PORT=3001

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VITE_PID_FILE="$ROOT_DIR/.vite.pid"
API_PID_FILE="$ROOT_DIR/.api.pid"
VITE_LOG_FILE="$ROOT_DIR/.vite.log"
API_LOG_FILE="$ROOT_DIR/.api.log"

# ── Find an available Vite port ───────────────────────────────────────────────
find_port() {
  local port=$PREFERRED_VITE_PORT
  while [ $port -le $MAX_VITE_PORT ]; do
    if ! lsof -i TCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1 && \
       ! ss -tlnH "sport = :$port" 2>/dev/null | grep -q .; then
      echo "$port"
      return
    fi
    port=$((port + 1))
  done
  echo ""
}

# ── Stop a process by PID file ────────────────────────────────────────────────
stop_pid_file() {
  local pid_file="$1"
  local label="$2"
  if [ -f "$pid_file" ]; then
    local old_pid
    old_pid=$(cat "$pid_file")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "Stopping previous $label (PID $old_pid)..."
      kill "$old_pid"
      sleep 1
    fi
    rm -f "$pid_file"
  fi
}

echo "=== Bible Study App Setup ==="
echo ""

# ── Node check ───────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed. Install it from https://nodejs.org/ (v18+)."
  exit 1
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js v18 or higher is required (found $(node -v))."
  exit 1
fi
echo "Node.js $(node -v) found."

# ── npm check ────────────────────────────────────────────────────────────────
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed."
  exit 1
fi
echo "npm $(npm -v) found."

# ── Install dependencies ──────────────────────────────────────────────────────
echo ""
echo "Installing dependencies..."
npm install

# ── Find a free Vite port ─────────────────────────────────────────────────────
echo ""
VITE_PORT=$(find_port)
if [ -z "$VITE_PORT" ]; then
  echo "ERROR: No free port found between $PREFERRED_VITE_PORT and $MAX_VITE_PORT."
  exit 1
fi

if [ "$VITE_PORT" -ne "$PREFERRED_VITE_PORT" ]; then
  echo "Port $PREFERRED_VITE_PORT is in use. Using port $VITE_PORT instead."
else
  echo "Port $VITE_PORT is available for Vite."
fi

# ── Stop any previously running instances ─────────────────────────────────────
stop_pid_file "$API_PID_FILE" "API server"
stop_pid_file "$VITE_PID_FILE" "Vite server"

# ── Start Express API server ──────────────────────────────────────────────────
echo ""
echo "Starting API server on http://localhost:$API_PORT"
echo "API logs: $API_LOG_FILE"

nohup node "$ROOT_DIR/server/index.js" > "$API_LOG_FILE" 2>&1 &
echo $! > "$API_PID_FILE"
echo "API server PID: $(cat "$API_PID_FILE")"

# Give the API a moment to initialise before Vite starts
sleep 1

# ── Start Vite dev server ─────────────────────────────────────────────────────
echo ""
echo "Starting Vite dev server on http://localhost:$VITE_PORT"
echo "Vite logs: $VITE_LOG_FILE"

nohup npx vite --port "$VITE_PORT" --host > "$VITE_LOG_FILE" 2>&1 &
echo $! > "$VITE_PID_FILE"
echo "Vite server PID: $(cat "$VITE_PID_FILE")"

echo ""
echo "Both servers are running."
echo ""
echo "To stop both:       kill \$(cat .api.pid) \$(cat .vite.pid)"
echo "To view API logs:   tail -f .api.log"
echo "To view Vite logs:  tail -f .vite.log"