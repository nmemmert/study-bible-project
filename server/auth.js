import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 200;
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** Blocks the request unless a logged-in session is present. */
export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not signed in.' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Two-factor auth (TOTP, RFC 6238 — compatible with any authenticator app)
// ---------------------------------------------------------------------------

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function totpKeyUri(email, secret) {
  return authenticator.keyuri(email, 'Bible Study Project', secret);
}

export function verifyTotpToken(token, secret) {
  if (typeof token !== 'string' || !/^\d{6}$/.test(token)) return false;
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

/** Returns { codes: string[] } plaintext codes to show the user once, for hashBackupCodes(). */
export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => randomBytes(5).toString('hex'));
}

export async function hashBackupCodes(codes) {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

/** Checks a submitted backup code against stored hashes; returns the remaining hashes if it matched, else null. */
export async function consumeBackupCode(submitted, hashes) {
  if (typeof submitted !== 'string' || !Array.isArray(hashes)) return null;
  const normalized = submitted.trim().toLowerCase();
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalized, hashes[i])) {
      return [...hashes.slice(0, i), ...hashes.slice(i + 1)];
    }
  }
  return null;
}
