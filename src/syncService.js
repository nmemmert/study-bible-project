/**
 * syncService.js
 *
 * Thin wrapper around the /api/projects endpoints.
 * All functions are fire-and-forget friendly: they never throw — they
 * return { ok: true, data } or { ok: false, error }.
 *
 * The caller decides whether to surface the error to the user.
 */

const BASE = '/api';

async function request(method, path, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err?.message ?? 'Network error' };
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all remote project summaries.
 * Returns { ok, data: Array<{ id, title, lastEdited, chapterSummary }> }
 */
export async function listRemoteProjects() {
  return request('GET', '/projects');
}

/**
 * Fetch a single full project by id.
 * Returns { ok, data: project }
 */
export async function loadRemoteProject(id) {
  return request('GET', `/projects/${id}`);
}

/**
 * Save (create or update) a project on the server.
 * Returns { ok, data: summary }
 */
export async function saveRemoteProject(project) {
  return request('PUT', `/projects/${project.id}`, project);
}

/**
 * Delete a project from the server.
 * Returns { ok }
 */
export async function deleteRemoteProject(id) {
  return request('DELETE', `/projects/${id}`);
}

/**
 * Check whether the server is reachable.
 * Returns true / false.
 */
export async function isServerReachable() {
  try {
    const res = await fetch(`${BASE}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}