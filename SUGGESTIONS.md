# Study App Improvement Suggestions

_Refreshed 2026-07-06 — the previous version of this file predated ~40 commits of feature work (OT support, tagging, DOCX import/export, split-view, commentary, cross-ref suggestions, and the full Bible Reader with audio/bookmarks/interlinear/search). Items already shipped have been removed; this reflects what's actually still open._

## Features

### Study Tools
- **Bible comparison mode** — show two translations side-by-side. `availableTranslations` is already fetched and a translation is already selectable per project (`App.jsx:904`), but only one renders at a time — no split/parallel view
- **Verse-level notes** — annotations are still chunk-level only (OIA fields); no way to attach a note to a single verse within a chunk
- **Progress tracking** — no "in progress"/"complete" marker per chunk and no progress bar on the home project card
- **Study templates** — no guiding prompts pre-filled for new users starting their first OIA entry
- **Word/character count** on the OIA and Final Script textareas — encourages note depth, useful for episode-length planning

### Export / Sharing
- **PDF export** / print stylesheet — still no `window.print()` CSS or PDF button anywhere in the app
- **Share link** — no read-only shareable URL for a project (useful for co-teachers reviewing an episode)
- **Markdown export** — HTML/DOCX/Claude-prompt exports exist; no plain Markdown output for Obsidian-style tools
- **Episode length estimate** — Final Script field exists per chunk; a word-count-based "~X minutes read aloud" estimate would help podcast planning

### Chunk Builder (Setup Page)
- **Drag-to-select verses** — still click-then-shift-click; no click-and-drag range selection
- **Auto-chunk** — no "split by paragraph/section" button; every chunk boundary is manual or typed

---

## UX / UI

### Navigation
- **Breadcrumb in header** — study page header only shows the project title (`App.jsx:4172`); no persistent "Genesis 1:1–5" reference next to it so users can tell at a glance where they are without checking the scripture panel

### Study Page
- **Word/char counters** — see above
- **Sticky bottom nav** — top Prev/Next chunk nav shipped (commit `103e20c`); a matching sticky bottom bar for long chunks would avoid scroll-back

### Home Page
- Search/filter/sort/rename are all implemented — nothing open here currently

---

## Code Architecture

### State Management
- **`App.jsx` is now ~5,100 lines** (up from ~2,250 when this doc was last written) — still one component from line 903–5044. Splitting into `pages/HomePage.jsx`, `pages/SetupPage.jsx`, `pages/StudyPage.jsx`, `pages/BibleReaderPage.jsx`, plus extracted hooks (`useProject`, `useGreekLookup`, `useAutosave`) is more valuable now than it was before, given the size increase
- **`commentarySource` doesn't persist** — resets to `'matthew-henry'` every session (`App.jsx:1107`), unlike `studyLayout`/`activeStudyTab` which do persist to localStorage via the same pattern

### Sync / Persistence
- ~~No auth on the backend~~ — fixed; email/password accounts with httpOnly cookie sessions (`server/auth.js`, `server/sessionStore.js`), projects scoped per-user in both SQLite (`server/db.js`) and localStorage (`App.jsx` `switchStorageUser`/namespaced keys), and pre-existing local projects auto-claimed by the first registered account
- No rate-limiting on `/api/auth/*` — a determined attacker could brute-force a weak password; worth adding if this is ever reachable beyond a small trusted group
- **Conflict resolution is still last-write-wins** — only `lastEdited` timestamps are compared; no "which version do you want to keep?" UI
- **"Restore"/"Pull latest from server" don't open the project** (`App.jsx:2997-3017`) — they refresh the local index but leave the user on the Home page instead of jumping into the study
- **Offline-first** — still no service worker; app requires a live connection to `bible.helloao.org` for chapter/audio/commentary loads with no cached fallback if that API is down

### Security (OWASP)
- ~~XSS via `dangerouslySetInnerHTML`~~ — fixed; `DOMPurify.sanitize()` now wraps both render paths (`App.jsx:4784`, `App.jsx:5020`)
- **No input validation on server** — still no max-length/character validation on `id`/`title` in `server/index.js`
- **CORS** — still no CORS headers configured

---

## Performance

- **Verse data stored in project JSON** — still true; full verse text is saved per chapter in both localStorage and SQLite
- **Reader bookmark icon is unclear** — shows a 🏷️ tag emoji before bookmarking and only switches to 🔖 after (`App.jsx:3641`), but the help text says "bookmark icon to save" — a plain outline bookmark icon would read more clearly from the start
- **No audio playback speed control** — chapter/reader audio only has play/pause/stop (`App.jsx:1037`); a 0.75x/1x/1.5x toggle would help slow, careful study listening
- **Hardcoded external API, no fallback** — audio and commentary both call `bible.helloao.org` directly (`App.jsx:985`, `App.jsx:1129`) with no retry UI if the free API is briefly down

---

## Testing

- Migration and prompt-building tests now exist (`migrateChunk`, `migrateProject`, `buildClaudePrompt`, `parseBibleChapter` are all covered in `src/utils.test.js`) — this section is essentially done
- Still missing: autosave debounce behavior, and coverage for the newer features (DOCX episode import, cross-ref auto-suggest, commentary loading)

---

## Developer Experience

- **No ESLint config** — still true; no `.eslintrc*` or `eslint.config.*` in the repo
- **No TypeScript** — still true
- **No `docker-compose.yml`** — still true; Dockerfile exists but no one-command local dev with server + SQLite volume
