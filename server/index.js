import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDb, getAllProjects, getProject, upsertProject, deleteProject } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/projects — list all project summaries (no full data)
// ---------------------------------------------------------------------------
app.get('/api/projects', (_req, res) => {
  try {
    const projects = getAllProjects();
    res.json(projects);
  } catch (err) {
    console.error('GET /api/projects error:', err);
    res.status(500).json({ error: 'Failed to list projects.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects/:id — fetch a single full project
// ---------------------------------------------------------------------------
app.get('/api/projects/:id', (req, res) => {
  try {
    const project = getProject(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json(project);
  } catch (err) {
    console.error('GET /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to load project.' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/projects/:id — create or update a project
// ---------------------------------------------------------------------------
app.put('/api/projects/:id', (req, res) => {
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
    const saved = upsertProject(body);
    res.json(saved);
  } catch (err) {
    console.error('PUT /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to save project.' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/projects/:id — remove a project
// ---------------------------------------------------------------------------
app.delete('/api/projects/:id', (req, res) => {
  try {
    deleteProject(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/projects/:id error:', err);
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

// ---------------------------------------------------------------------------
// Serve Vite production build (when NODE_ENV=production)
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production') {
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
  if (process.env.NODE_ENV === 'production') {
    console.log('Serving Vite build from /dist');
  }
});