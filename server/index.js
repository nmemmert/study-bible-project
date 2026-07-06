import express from 'express';
import session from 'express-session';
import QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  initDb, getAllProjects, getProject, upsertProject, deleteProject,
  countUsers, createUser, getUserByEmail, getUserById, claimOrphanProjects,
  enableTotp, disableTotp, setBackupCodeHashes, setPodcastName,
} from './db.js';
import { SqliteSessionStore } from './sessionStore.js';
import {
  isValidEmail, isValidPassword, hashPassword, verifyPassword, requireAuth,
  generateTotpSecret, totpKeyUri, verifyTotpToken,
  generateBackupCodes, hashBackupCodes, consumeBackupCode,
} from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set. Set it to a long random string in production.');
}

// Trust the reverse proxy (needed for secure cookies to work behind nginx/etc).
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));
app.use(session({
  store: new SqliteSessionStore(),
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (getUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const user = createUser({ id: randomUUID(), email, passwordHash });

    // The very first account inherits any projects created before multi-user support existed.
    if (countUsers() === 1) {
      claimOrphanProjects(user.id);
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Could not create session.' });
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, totpEnabled: false, podcastName: null });
    });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ error: 'Failed to register.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    const user = getUserByEmail(email);
    const valid = user && await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Could not create session.' });
      if (user.totpEnabled) {
        // Password is correct, but the session stays unauthenticated (no userId)
        // until a valid TOTP/backup code lands on /api/auth/mfa/verify.
        req.session.pendingUserId = user.id;
        return res.json({ mfaRequired: true });
      }
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, totpEnabled: false, podcastName: user.podcastName ?? null });
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

app.post('/api/auth/mfa/verify', async (req, res) => {
  try {
    const pendingUserId = req.session?.pendingUserId;
    if (!pendingUserId) {
      return res.status(400).json({ error: 'No sign-in in progress.' });
    }
    const user = getUserById(pendingUserId);
    if (!user || !user.totpEnabled) {
      return res.status(400).json({ error: 'No sign-in in progress.' });
    }

    const token = req.body?.token;
    const backupCode = req.body?.backupCode;
    let ok = token ? verifyTotpToken(String(token), user.totpSecret) : false;

    if (!ok && backupCode) {
      const remaining = await consumeBackupCode(String(backupCode), user.backupCodeHashes);
      if (remaining) {
        setBackupCodeHashes(user.id, remaining);
        ok = true;
      }
    }

    if (!ok) {
      return res.status(401).json({ error: 'Invalid code.' });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Could not create session.' });
      req.session.userId = user.id;
      res.json({ id: user.id, email: user.email, totpEnabled: true, podcastName: user.podcastName ?? null });
    });
  } catch (err) {
    console.error('POST /api/auth/mfa/verify error:', err);
    res.status(500).json({ error: 'Failed to verify code.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = req.session?.userId ? getUserById(req.session.userId) : null;
  if (!user) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ id: user.id, email: user.email, totpEnabled: user.totpEnabled, podcastName: user.podcastName ?? null });
});

// ---------------------------------------------------------------------------
// PATCH /api/auth/profile — update account-level settings (currently just podcastName)
// ---------------------------------------------------------------------------
app.patch('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const podcastName = String(req.body?.podcastName ?? '').trim().slice(0, 200);
    setPodcastName(req.session.userId, podcastName || null);
    res.json({ podcastName: podcastName || null });
  } catch (err) {
    console.error('PATCH /api/auth/profile error:', err);
    res.status(500).json({ error: 'Failed to save profile.' });
  }
});

// ---------------------------------------------------------------------------
// Two-factor auth setup (requires an already-authenticated session)
// ---------------------------------------------------------------------------

app.post('/api/auth/mfa/setup', requireAuth, (req, res) => {
  try {
    const user = getUserById(req.session.userId);
    const secret = generateTotpSecret();
    // Held only in the session until confirmed with a real code — never written
    // to the DB (and 2FA never turned on) unless /mfa/enable succeeds below.
    req.session.pendingTotpSecret = secret;
    QRCode.toDataURL(totpKeyUri(user.email, secret), (err, qrCodeDataUrl) => {
      if (err) return res.status(500).json({ error: 'Failed to generate QR code.' });
      res.json({ secret, qrCodeDataUrl });
    });
  } catch (err) {
    console.error('POST /api/auth/mfa/setup error:', err);
    res.status(500).json({ error: 'Failed to start 2FA setup.' });
  }
});

app.post('/api/auth/mfa/enable', requireAuth, async (req, res) => {
  try {
    const secret = req.session.pendingTotpSecret;
    if (!secret) {
      return res.status(400).json({ error: 'Start 2FA setup first.' });
    }
    if (!verifyTotpToken(String(req.body?.token ?? ''), secret)) {
      return res.status(401).json({ error: 'That code didn\'t match. Check your authenticator app and try again.' });
    }

    const backupCodes = generateBackupCodes();
    const backupCodeHashes = await hashBackupCodes(backupCodes);
    enableTotp(req.session.userId, secret, backupCodeHashes);
    delete req.session.pendingTotpSecret;
    res.json({ backupCodes });
  } catch (err) {
    console.error('POST /api/auth/mfa/enable error:', err);
    res.status(500).json({ error: 'Failed to enable 2FA.' });
  }
});

app.post('/api/auth/mfa/disable', requireAuth, async (req, res) => {
  try {
    const user = getUserById(req.session.userId);
    const valid = await verifyPassword(String(req.body?.password ?? ''), user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    disableTotp(user.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/auth/mfa/disable error:', err);
    res.status(500).json({ error: 'Failed to disable 2FA.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects — list all project summaries owned by the current user
// ---------------------------------------------------------------------------
app.get('/api/projects', requireAuth, (req, res) => {
  try {
    const projects = getAllProjects(req.session.userId);
    res.json(projects);
  } catch (err) {
    console.error('GET /api/projects error:', err);
    res.status(500).json({ error: 'Failed to list projects.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id — fetch a single full project owned by the current user
// ---------------------------------------------------------------------------
app.get('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const project = getProject(req.params.id, req.session.userId);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json(project);
  } catch (err) {
    console.error('GET /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to load project.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:id — create or update a project owned by the current user
// ---------------------------------------------------------------------------
app.put('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Invalid JSON body.' });
    }
    if (!body.id || !body.title || !Array.isArray(body.chapters)) {
      return res.status(400).json({ error: 'Missing required fields: id, title, chapters.' });
    }
    if (body.id !== req.params.id) {
      return res.status(400).json({ error: 'URL id does not match body id.' });
    }
    const saved = upsertProject(body, req.session.userId);
    if (!saved) {
      return res.status(403).json({ error: 'That project belongs to a different account.' });
    }
    res.json(saved);
  } catch (err) {
    console.error('PUT /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to save project.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id — remove a project owned by the current user
// ---------------------------------------------------------------------------
app.delete('/api/projects/:id', requireAuth, (req, res) => {
  try {
    deleteProject(req.params.id, req.session.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// ---------------------------------------------------------------------------
// Serve Vite production build (when NODE_ENV=production)
// ---------------------------------------------------------------------------
if (isProd) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
initDb();
app.listen(PORT, () => {
  console.log(`Bible Study API running on http://localhost:${PORT}`);
  if (isProd) {
    console.log('Serving Vite build from /dist');
  }
});
