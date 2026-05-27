#!/usr/bin/env bash
set -euo pipefail

PREFERRED_PORT=5173
MAX_PORT=5200

# Find an available port starting from PREFERRED_PORT
find_port() {
  local port=$PREFERRED_PORT
  while [ $port -le $MAX_PORT ]; do
    if ! lsof -i TCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1 && \
       ! ss -tlnH "sport = :$port" 2>/dev/null | grep -q .; then
      echo "$port"
      return
    fi
    port=$((port + 1))
  done
  echo ""
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

# ── Find a free port ─────────────────────────────────────────────────────────
echo ""
PORT=$(find_port)
if [ -z "$PORT" ]; then
  echo "ERROR: No free port found between $PREFERRED_PORT and $MAX_PORT."
  exit 1
fi

if [ "$PORT" -ne "$PREFERRED_PORT" ]; then
  echo "Port $PREFERRED_PORT is in use. Using port $PORT instead."
else
  echo "Port $PORT is available."
fi

# ── Launch ────────────────────────────────────────────────────────────────────
echo ""
echo "Starting dev server on http://localhost:$PORT"
echo "(Press Ctrl+C to stop)"
echo ""
exec npx vite --port "$PORT" --host
