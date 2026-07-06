import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'projects.db');

let db;

// ---------------------------------------------------------------------------
// Init — create tables if they don't exist, migrate older schemas
// ---------------------------------------------------------------------------
export function initDb() {
  mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);

  // Enable WAL for better concurrent read performance
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      last_edited INTEGER NOT NULL,
      chapter_summary TEXT,
      data        TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid     TEXT PRIMARY KEY,
      sess    TEXT NOT NULL,
      expires INTEGER NOT NULL
    );
  `);

  // Older databases predate multi-user support — add the ownership column.
  const projectCols = db.prepare('PRAGMA table_info(projects)').all();
  if (!projectCols.some((c) => c.name === 'user_id')) {
    db.exec('ALTER TABLE projects ADD COLUMN user_id TEXT REFERENCES users(id)');
  }

  // Older databases predate 2FA support — add the TOTP columns.
  const userCols = db.prepare('PRAGMA table_info(users)').all();
  if (!userCols.some((c) => c.name === 'totp_secret')) {
    db.exec(`
      ALTER TABLE users ADD COLUMN totp_secret TEXT;
      ALTER TABLE users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE users ADD COLUMN backup_codes TEXT;
    `);
  }

  console.log(`SQLite database ready at ${DB_PATH}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSummary(project) {
  if (!Array.isArray(project.chapters)) return '';
  return project.chapters.map((ch) => `${ch.book} ${ch.chapter}`).join(', ');
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export function countUsers() {
  return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

export function createUser({ id, email, passwordHash }) {
  const createdAt = Date.now();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, created_at)
    VALUES (?, ?, ?, ?)
  `).run(id, email, passwordHash, createdAt);
  return { id, email, createdAt };
}

function parseUserRow(row) {
  if (!row) return null;
  return {
    ...row,
    totpEnabled: !!row.totpEnabled,
    backupCodeHashes: row.backupCodesRaw ? JSON.parse(row.backupCodesRaw) : [],
  };
}

const USER_SELECT = `
  SELECT id, email, password_hash AS passwordHash, created_at AS createdAt,
         totp_secret AS totpSecret, totp_enabled AS totpEnabled, backup_codes AS backupCodesRaw
  FROM users
`;

export function getUserByEmail(email) {
  return parseUserRow(db.prepare(`${USER_SELECT} WHERE email = ?`).get(email));
}

export function getUserById(id) {
  return parseUserRow(db.prepare(`${USER_SELECT} WHERE id = ?`).get(id));
}

/** Persists a confirmed TOTP secret + one-time backup code hashes, turning 2FA on. */
export function enableTotp(userId, secret, backupCodeHashes) {
  db.prepare(`
    UPDATE users SET totp_secret = ?, totp_enabled = 1, backup_codes = ? WHERE id = ?
  `).run(secret, JSON.stringify(backupCodeHashes), userId);
}

/** Turns 2FA off and forgets the secret/backup codes entirely. */
export function disableTotp(userId) {
  db.prepare(`
    UPDATE users SET totp_secret = NULL, totp_enabled = 0, backup_codes = NULL WHERE id = ?
  `).run(userId);
}

/** Rewrites the remaining backup-code hashes after one is used (single-use codes). */
export function setBackupCodeHashes(userId, backupCodeHashes) {
  db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?').run(JSON.stringify(backupCodeHashes), userId);
}

/**
 * Assigns any pre-existing, unowned projects (from before multi-user support)
 * to the given user. Intended to run once, right after the first account is created.
 */
export function claimOrphanProjects(userId) {
  db.prepare('UPDATE projects SET user_id = ? WHERE user_id IS NULL').run(userId);
}

// ---------------------------------------------------------------------------
// Project queries — all scoped to the owning user
// ---------------------------------------------------------------------------

/**
 * Returns all project summaries owned by userId (id, title, lastEdited, chapterSummary).
 * Does NOT return full project data to keep the response small.
 */
export function getAllProjects(userId) {
  const rows = db.prepare(`
    SELECT id, title, last_edited AS lastEdited, chapter_summary AS chapterSummary
    FROM projects
    WHERE user_id = ?
    ORDER BY last_edited DESC
  `).all(userId);
  return rows;
}

/**
 * Returns a single full project by id, scoped to userId, or null if not found/not owned.
 */
export function getProject(id, userId) {
  const row = db.prepare('SELECT data FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/**
 * Insert or replace a project owned by userId.
 * Returns the summary, or null if the id already belongs to a different user.
 */
export function upsertProject(project, userId) {
  const existing = db.prepare('SELECT user_id AS userId FROM projects WHERE id = ?').get(project.id);
  if (existing && existing.userId !== userId) {
    return null;
  }

  const lastEdited = project.lastEdited ?? Date.now();
  const chapterSummary = buildSummary(project);
  const updated = { ...project, lastEdited };

  db.prepare(`
    INSERT INTO projects (id, title, last_edited, chapter_summary, data, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title           = excluded.title,
      last_edited     = excluded.last_edited,
      chapter_summary = excluded.chapter_summary,
      data            = excluded.data
  `).run(project.id, project.title, lastEdited, chapterSummary, JSON.stringify(updated), userId);

  return { id: project.id, title: project.title, lastEdited, chapterSummary };
}

/**
 * Delete a project by id, scoped to userId. No-op if not found/not owned.
 */
export function deleteProject(id, userId) {
  db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(id, userId);
}

// ---------------------------------------------------------------------------
// Session store backing (used by server/sessionStore.js)
// ---------------------------------------------------------------------------

export function getSession(sid) {
  const row = db.prepare('SELECT sess, expires FROM sessions WHERE sid = ?').get(sid);
  if (!row || row.expires < Date.now()) return null;
  try {
    return JSON.parse(row.sess);
  } catch {
    return null;
  }
}

export function setSession(sid, sess, expires) {
  db.prepare(`
    INSERT INTO sessions (sid, sess, expires)
    VALUES (?, ?, ?)
    ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires
  `).run(sid, JSON.stringify(sess), expires);
}

export function destroySession(sid) {
  db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
}

export function pruneExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
}
