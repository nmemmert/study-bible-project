# Bible Study App

A self-hosted Bible study tool with notes, projects, and user accounts.

---

## Requirements

- **Node.js v18 or higher** — [nodejs.org](https://nodejs.org/)
- **npm** (bundled with Node.js)
- **GCC / make** (only needed for production/server installs — required to build the `better-sqlite3` native module)

---

## Quick Start (Development)

```bash
git clone https://github.com/nmemmert/study-bible-project.git
cd study-bible-project
bash setup.sh
```

`setup.sh` installs dependencies, finds a free port, and starts both servers:

| Server | Default URL |
|--------|-------------|
| API (Express) | http://localhost:3001 |
| Frontend (Vite) | http://localhost:5173 |

**Stop the servers:**
```bash
kill $(cat .api.pid) $(cat .vite.pid)
```

**View logs:**
```bash
tail -f .api.log    # API server
tail -f .vite.log   # Vite dev server
```

---

## Production Install (Ubuntu / systemd)

Installs the app as a persistent systemd service under `/opt/study-app`.

```bash
# Install Node.js 20 (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build tools (required for better-sqlite3)
sudo apt-get install -y build-essential python3

# Clone and install
git clone https://github.com/nmemmert/study-bible-project.git
cd study-bible-project
sudo bash deploy/install.sh
```

The installer will:
1. Install Node.js dependencies and build the frontend
2. Create a `study-app` system user
3. Register and start a systemd service

**Useful commands after install:**
```bash
systemctl status study-app          # Check service status
journalctl -u study-app -f          # Stream logs
systemctl restart study-app         # Restart after an update
```

**Open the firewall port (if needed):**
```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

The app listens on **port 3001** by default. Set the `PORT` environment variable in the systemd unit to change it.

---

## Updating (Production)

```bash
cd /path/to/study-bible-project
git pull
sudo bash deploy/install.sh
```

The installer preserves the session secret across updates so logged-in users are not signed out.

---

## Migrating to a New Machine

**On the old machine — create a backup:**
```bash
npm run backup
```
This creates `study-app-backup_<timestamp>.zip` in the project root.

**On the new machine — restore after cloning and installing:**
```bash
npm run restore study-app-backup_<timestamp>.zip
```

See [scripts/backup-data.sh](scripts/backup-data.sh) and [scripts/restore-data.sh](scripts/restore-data.sh) for details.

---

## Project Structure

```
├── server/          # Express API + SQLite database
│   └── data/        # projects.db lives here (gitignored)
├── src/             # React frontend (Vite)
├── deploy/          # systemd service unit + install script
├── scripts/         # backup / restore helpers
└── setup.sh         # Development quick-start
```

---

## License

Private / personal use.
