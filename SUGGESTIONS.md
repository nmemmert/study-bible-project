# Study App Improvement Suggestions

_Refreshed 2026-07-06 (multiple passes) — items already shipped have been removed; this reflects what's actually still open. Recent additions: multi-user auth with per-account data scoping, TOTP 2FA with backup codes, podcast terminology generalized to "Session" for study-only users (with a configurable podcast/show name), auto-restore on new devices, study templates (richer OIA guiding prompts), PDF/print export, Markdown export, a passage breadcrumb, whole-Bible search, better bookmark UX (always-visible SVG icons + a jump-to panel), read-only share links, and an admin panel (`server/auth.js` `ADMIN_EMAIL`, hardcoded to the site owner's account) showing every user/project with view/delete controls._

## Features

### Study Tools
- **Bible comparison mode** — show two translations side-by-side. `availableTranslations` is already fetched and a translation is already selectable per project, but only one renders at a time — no split/parallel view
- **Verse-level notes** — annotations are still chunk-level only (OIA fields); no way to attach a note to a single verse within a chunk
- **Progress tracking** — no "in progress"/"complete" marker per chunk and no progress bar on the home project card

### Export / Sharing
- **Episode length estimate** — Final Script field exists per chunk; a word-count-based "~X minutes read aloud" estimate would help podcast planning
- **Share link is single-use-case** — one share token per project, all-or-nothing (whole project, all chunks). A per-chunk or per-chapter share might be worth it for someone who only wants to share one episode's notes rather than the whole series

### Chunk Builder (Setup Page)
- **Drag-to-select verses** — still click-then-shift-click; no click-and-drag range selection
- **Auto-chunk** — no "split by paragraph/section" button; every chunk boundary is manual or typed

---

## UX / UI

### Study Page
- **Sticky bottom nav** — top Prev/Next chunk nav shipped (commit `103e20c`); a matching sticky bottom bar for long chunks would avoid scroll-back

### Reader
- **Whole-Bible search index isn't persisted** — the ~7MB `complete.json` fetch is cached in-memory only for the session; a page reload re-downloads it. Worth persisting to IndexedDB (not localStorage — too small) if this gets used often
- **Bookmark color picker is still an emoji button** (🎨) — the bookmark/copy icons became proper SVGs, but color-cycling didn't get the same treatment

### Home Page
- Search/filter/sort/rename are all implemented — nothing open here currently

---

## Code Architecture

### State Management
- **`App.jsx` is now ~5,700+ lines** — still one component. Splitting into `pages/HomePage.jsx`, `pages/SetupPage.jsx`, `pages/StudyPage.jsx`, `pages/BibleReaderPage.jsx`, plus extracted hooks (`useProject`, `useGreekLookup`, `useAutosave`) is more valuable now than ever given the continued size growth

### Sync / Persistence
- No rate-limiting on `/api/auth/*` — a determined attacker could brute-force a weak password or 2FA code; worth adding if this is ever reachable beyond a small trusted group
- **Conflict resolution is still last-write-wins** — only `lastEdited` timestamps are compared; no "which version do you want to keep?" UI
- **Offline-first** — still no service worker; app requires a live connection to `bible.helloao.org` for chapter/audio/commentary loads with no cached fallback if that API is down

### Security (OWASP)
- **No input validation on server** — still no max-length/character validation on `id`/`title` in `server/index.js`
- **CORS** — still no CORS headers configured
- **Shared HTML view is sandboxed but not escaped** — `buildExportHtml` interpolates OIA notes into HTML without escaping `<`/`>`/`&`; the public share view mitigates this by rendering in a `sandbox="allow-popups"` iframe (no `allow-scripts`, so injected `<script>`/event handlers can't execute), but the underlying string-building still isn't defense-in-depth. Worth properly HTML-escaping user text in `buildExportHtml` itself

---

## Performance

- **Verse data stored in project JSON** — still true; full verse text is saved per chapter in both localStorage and SQLite
- **Hardcoded external API, no fallback** — audio and commentary both call `bible.helloao.org` directly with no retry UI if the free API is briefly down; whole-Bible search now adds a third hard dependency on this API (`/complete.json`)

---

## Testing

- Missing: autosave debounce behavior, DOCX session-list import, cross-ref auto-suggest, commentary loading, and no coverage yet for the newer share-link/2FA/whole-Bible-search flows (all verified manually in-browser instead)

---

## Developer Experience

- **No ESLint config** — still true; no `.eslintrc*` or `eslint.config.*` in the repo
- **No TypeScript** — still true
- **No `docker-compose.yml`** — still true; Dockerfile exists but no one-command local dev with server + SQLite volume
