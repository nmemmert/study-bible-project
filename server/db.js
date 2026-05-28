import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data');
const DB_PATH = join(DATA_DIR, 'projects.db');

let db;

// ---------------------------------------------------------------------------
// Init — create tables if they don't exist
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
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns all project summaries (id, title, lastEdited, chapterSummary).
 * Does NOT return full project data to keep the response small.
 */
export function getAllProjects() {
  const rows = db.prepare(`
    SELECT id, title, last_edited AS lastEdited, chapter_summary AS chapterSummary
    FROM projects
    ORDER BY last_edited DESC
  `).all();
  return rows;
}

/**
 * Returns a single full project by id, or null if not found.
 */
export function getProject(id) {
  const row = db.prepare('SELECT data FROM projects WHERE id = ?').get(id);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

/**
 * Insert or replace a project. Returns the summary.
 */
export function upsertProject(project) {
  const lastEdited = project.lastEdited ?? Date.now();
  const chapterSummary = buildSummary(project);
  const updated = { ...project, lastEdited };

  db.prepare(`
    INSERT INTO projects (id, title, last_edited, chapter_summary, data)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title           = excluded.title,
      last_edited     = excluded.last_edited,
      chapter_summary = excluded.chapter_summary,
      data            = excluded.data
  `).run(project.id, project.title, lastEdited, chapterSummary, JSON.stringify(updated));

  return { id: project.id, title: project.title, lastEdited, chapterSummary };
}

/**
 * Delete a project by id. No-op if not found.
 */
export function deleteProject(id) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}