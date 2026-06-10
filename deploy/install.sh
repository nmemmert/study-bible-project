#!/usr/bin/env bash
# Install Bible Study App as a systemd service on Rocky Linux (or any systemd distro).
#
# Usage:
#   sudo ./deploy/install.sh [INSTALL_DIR]
#
# Defaults to /opt/study-app. Run from the project repo root.
set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g. with sudo)." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_DIR="${1:-/opt/study-app}"
SERVICE_USER="study-app"
SERVICE_NAME="study-app"

echo "=== Installing Bible Study App to $INSTALL_DIR ==="

# ── Node check ────────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed."
  echo "On Rocky Linux, install via NodeSource, e.g.:"
  echo "  curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"
  echo "  sudo dnf install -y nodejs"
  exit 1
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "ERROR: Node.js v18+ required (found $(node -v))."
  exit 1
fi
echo "Node.js $(node -v) found."

# build tools needed for better-sqlite3 native module
if ! command -v gcc >/dev/null 2>&1 || ! command -v make >/dev/null 2>&1; then
  echo "Installing build tools (Development Tools group + python3)..."
  dnf groupinstall -y "Development Tools"
  dnf install -y python3
fi

# ── Create service user ─────────────────────────────────────────────────────
if ! id "$SERVICE_USER" >/dev/null 2>&1; then
  echo "Creating service user '$SERVICE_USER'..."
  useradd --system --home-dir "$INSTALL_DIR" --shell /sbin/nologin "$SERVICE_USER"
fi

# ── Copy app files ────────────────────────────────────────────────────────────
echo "Copying application files to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '*.pid' \
  --exclude '*.log' \
  "$ROOT_DIR"/ "$INSTALL_DIR"/

cd "$INSTALL_DIR"

# ── Install dependencies & build ─────────────────────────────────────────────
echo "Installing dependencies (this can take a while for better-sqlite3)..."
npm ci || npm install

echo "Building production frontend..."
npx vite build

echo "Removing dev dependencies..."
npm prune --omit=dev

# ── Permissions ──────────────────────────────────────────────────────────────
chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR"

# ── systemd unit ──────────────────────────────────────────────────────────────
echo "Installing systemd unit..."
sed "s#/opt/study-app#$INSTALL_DIR#g; s#User=study-app#User=$SERVICE_USER#; s#Group=study-app#Group=$SERVICE_USER#" \
  "$ROOT_DIR/deploy/study-app.service" > "/etc/systemd/system/${SERVICE_NAME}.service"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo ""
echo "=== Done ==="
echo "Service status: systemctl status $SERVICE_NAME"
echo "Logs:           journalctl -u $SERVICE_NAME -f"
echo "App listens on: http://0.0.0.0:\${PORT:-3001}"
echo ""
echo "If you have a firewall enabled, allow the port, e.g.:"
echo "  sudo firewall-cmd --add-port=3001/tcp --permanent && sudo firewall-cmd --reload"
