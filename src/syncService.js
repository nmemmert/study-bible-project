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
      credentials: 'include',
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    return { ok: false, status: null, error: err?.message ?? 'Network error' };
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

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Returns the signed-in user, or null if not signed in.
 * Returns { ok: false } (with status: null) only on a genuine network failure,
 * so callers can distinguish "not logged in" from "server unreachable".
 */
export async function getCurrentUser() {
  const result = await request('GET', '/auth/me');
  if (result.ok) return { ok: true, user: result.data };
  if (result.status === 401) return { ok: true, user: null };
  return result;
}

export async function registerUser(email, password) {
  return request('POST', '/auth/register', { email, password });
}

export async function loginUser(email, password) {
  return request('POST', '/auth/login', { email, password });
}

export async function logoutUser() {
  return request('POST', '/auth/logout');
}

/** Submits the code from the auth gate's post-password MFA step. Pass token or backupCode. */
export async function verifyMfaLogin({ token, backupCode }) {
  return request('POST', '/auth/mfa/verify', { token, backupCode });
}

/** Updates account-level profile settings (currently just the podcast/show name). */
export async function updateProfile({ podcastName }) {
  return request('PATCH', '/auth/profile', { podcastName });
}

// ---------------------------------------------------------------------------
// Two-factor auth setup (Account Settings page)
// ---------------------------------------------------------------------------

/** Starts 2FA setup: returns { secret, qrCodeDataUrl } for the user to scan. */
export async function startMfaSetup() {
  return request('POST', '/auth/mfa/setup');
}

/** Confirms the scanned code and turns 2FA on. Returns { backupCodes } (shown once). */
export async function confirmMfaSetup(token) {
  return request('POST', '/auth/mfa/enable', { token });
}

/** Turns 2FA off. Requires the current password as a safety check. */
export async function disableMfa(password) {
  return request('POST', '/auth/mfa/disable', { password });
}