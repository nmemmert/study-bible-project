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

  // Older databases predate the podcast-name profile setting.
  if (!userCols.some((c) => c.name === 'podcast_name')) {
    db.exec('ALTER TABLE users ADD COLUMN podcast_name TEXT');
  }

  // Older databases predate shareable read-only links.
  if (!projectCols.some((c) => c.name === 'share_token')) {
    db.exec('ALTER TABLE projects ADD COLUMN share_token TEXT');
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_share_token ON projects(share_token) WHERE share_token IS NOT NULL');

  // Reader ink — one row per user + book + chapter, stored as JSON
  db.exec(`
    CREATE TABLE IF NOT EXISTS reader_ink (
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      book_abbrev TEXT NOT NULL,
      chapter     INTEGER NOT NULL,
      strokes     TEXT NOT NULL,
      updated_at  INTEGER NOT NULL,
      PRIMARY KEY (user_id, book_abbrev, chapter)
    );
  `);

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
         totp_secret AS totpSecret, totp_enabled AS totpEnabled, backup_codes AS backupCodesRaw,
         podcast_name AS podcastName
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

/** Sets or clears the show name used in the "Prepare for Podcast" prompt. */
export function setPodcastName(userId, podcastName) {
  db.prepare('UPDATE users SET podcast_name = ? WHERE id = ?').run(podcastName || null, userId);
}

/** Rewrites the remaining backup-code hashes after one is used (single-use codes). */
export function setBackupCodeHashes(userId, backupCodeHashes) {
  db.prepare('UPDATE users SET backup_codes = ? WHERE id = ?').run(JSON.stringify(backupCodeHashes), userId);
}

// ---------------------------------------------------------------------------
// Reader ink — cross-device sync for draw-mode annotations in the reader
// ---------------------------------------------------------------------------

/** Returns all saved reader ink pages for a user as { "BOOK_CH": strokes[] }. */
export function getAllReaderInk(userId) {
  const rows = db.prepare(
    'SELECT book_abbrev AS book, chapter, strokes FROM reader_ink WHERE user_id = ?'
  ).all(userId);
  return Object.fromEntries(
    rows.map((r) => [`${r.book}_${r.chapter}`, JSON.parse(r.strokes)])
  );
}

/** Upserts the ink strokes for one reader page. */
export function setReaderInkPage(userId, bookAbbrev, chapter, strokes) {
  db.prepare(`
    INSERT INTO reader_ink (user_id, book_abbrev, chapter, strokes, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, book_abbrev, chapter)
    DO UPDATE SET strokes = excluded.strokes, updated_at = excluded.updated_at
  `).run(userId, bookAbbrev, Number(chapter), JSON.stringify(strokes), Date.now());
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
// Read-only share links
// ---------------------------------------------------------------------------

/** Returns the current share token for a project owned by userId, or null. */
export function getShareToken(id, userId) {
  const row = db.prepare('SELECT share_token AS shareToken FROM projects WHERE id = ? AND user_id = ?').get(id, userId);
  return row?.shareToken ?? null;
}

/** Sets a project's share token (enabling its public read-only link), scoped to userId. */
export function setShareToken(id, userId, token) {
  const result = db.prepare('UPDATE projects SET share_token = ? WHERE id = ? AND user_id = ?').run(token, id, userId);
  return result.changes > 0;
}

/** Revokes a project's share link, scoped to userId. */
export function clearShareToken(id, userId) {
  db.prepare('UPDATE projects SET share_token = NULL WHERE id = ? AND user_id = ?').run(id, userId);
}

/** Public lookup: returns the full project data for a valid share token, or null. No ownership check — this is the point. */
export function getProjectByShareToken(token) {
  const row = db.prepare('SELECT data FROM projects WHERE share_token = ?').get(token);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin — unscoped views across every user/project. Callers must gate access
// themselves (see requireAdmin in server/auth.js); nothing here checks who's asking.
// ---------------------------------------------------------------------------

/** Every account, with a project count, for the admin users list. */
export function adminGetAllUsers() {
  return db.prepare(`
    SELECT u.id, u.email, u.created_at AS createdAt, u.totp_enabled AS totpEnabled,
           (SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id) AS projectCount
    FROM users u
    ORDER BY u.created_at ASC
  `).all().map((r) => ({ ...r, totpEnabled: !!r.totpEnabled }));
}

/** Deletes a user account. Their projects are left in place (orphaned, not cascade-deleted) so data isn't lost by accident. */
export function adminDeleteUser(userId) {
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

/** Every project across every user, with the owner's email, for the admin projects list. */
export function adminGetAllProjects() {
  return db.prepare(`
    SELECT p.id, p.title, p.last_edited AS lastEdited, p.chapter_summary AS chapterSummary,
           p.share_token AS shareToken, u.email AS ownerEmail
    FROM projects p
    LEFT JOIN users u ON u.id = p.user_id
    ORDER BY p.last_edited DESC
  `).all();
}

/** Full project data by id, regardless of owner — for admin inspection. */
export function adminGetProject(id) {
  const row = db.prepare('SELECT data FROM projects WHERE id = ?').get(id);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/** Deletes any project by id, regardless of owner. */
export function adminDeleteProject(id) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

/** Overwrites a user's password hash directly — used for both self-service and admin-assisted resets. */
export function setUserPassword(userId, passwordHash) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
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

/**
 * Logs a user out everywhere by deleting every session that belongs to them.
 * Sessions don't have an indexed user_id column (they're just an opaque JSON
 * blob to express-session), so this scans and parses — fine at this app's scale.
 * Pass exceptSid to keep one session alive (e.g. the one completing a self-service
 * password change, so the user isn't immediately logged out of their own action).
 */
export function destroyAllSessionsForUser(userId, exceptSid = null) {
  const rows = db.prepare('SELECT sid, sess FROM sessions').all();
  const staleSids = rows
    .filter((row) => row.sid !== exceptSid)
    .filter((row) => {
      try {
        return JSON.parse(row.sess)?.userId === userId;
      } catch {
        return false;
      }
    })
    .map((row) => row.sid);
  if (staleSids.length === 0) return;
  const placeholders = staleSids.map(() => '?').join(',');
  db.prepare(`DELETE FROM sessions WHERE sid IN (${placeholders})`).run(...staleSids);
}
