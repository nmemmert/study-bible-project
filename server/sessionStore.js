import session from 'express-session';
import { getSession, setSession, destroySession, pruneExpiredSessions } from './db.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * express-session store backed by the same SQLite database as everything else,
 * so logins survive a server restart without adding another dependency.
 */
export class SqliteSessionStore extends session.Store {
  constructor() {
    super();
    // Sweep expired sessions periodically instead of on every request.
    this._interval = setInterval(() => pruneExpiredSessions(), DAY_MS);
    this._interval.unref?.();
  }

  get(sid, cb) {
    try {
      cb(null, getSession(sid));
    } catch (err) {
      cb(err);
    }
  }

  set(sid, sessionData, cb) {
    try {
      const maxAge = sessionData.cookie?.maxAge ?? DAY_MS * 30;
      setSession(sid, sessionData, Date.now() + maxAge);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  destroy(sid, cb) {
    try {
      destroySession(sid);
      cb?.(null);
    } catch (err) {
      cb?.(err);
    }
  }

  touch(sid, sessionData, cb) {
    this.set(sid, sessionData, cb);
  }
}
