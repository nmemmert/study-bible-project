# Study App Improvement Suggestions

## Features

### Study Tools
- **Bible comparison mode** — show two translations side-by-side (API already supports it)
- **Verse-level notes** — annotate individual verses, not just chunks
- **Tagging / themes** — tag chunks with themes (e.g. "faith", "grace"), filter/search across projects
- **Progress tracking** — mark chunks as "in progress" / "complete"; show progress bar on home card
- **Study templates** — pre-fill OIA fields with guiding prompts for new users
- **Print view** — clean print-optimized CSS layout
- **Old Testament support** — only NT books listed; HelloAO API supports OT. Greek suggest is NT-only but the rest could support OT with Hebrew lookup
- **Verse search** — search bar to find a verse by keyword across the loaded chapter

### Export / Sharing
- **PDF export** — "Export PDF" button using `jsPDF` or `window.print()`
- **Share link** — read-only shareable URL pointing to a project ID on the server
- **Copy individual chunk** — "copy this chunk's notes" button alongside full "Prepare for Claude"
- **Markdown export** — useful for Obsidian and similar note-taking apps

---

## UX / UI

### Navigation
- **Keyboard shortcuts** — `←`/`→` to navigate chunks; `Ctrl+S` to save; `Escape` to close modals
- **"Jump to chunk" dropdown** — for projects with many chunks, a select menu is faster than scrolling
- **Breadcrumb in header** — show `Book Chapter:Verse range` so users always know where they are

### Chunk Builder (Setup Page)
- **Drag-to-select verses** — click-and-drag instead of click then shift-click
- **Auto-chunk** — button to split chapter into chunks by paragraph/section breaks
- **Visual overlap indicator** — already-chunked verses are shaded but there's no tooltip explaining why you can't select them

### Study Page
- **Collapsible sections** — collapse OIA, Cross-References, and Greek Word Studies independently
- **Word/character count** on each textarea to encourage note depth
- **Inline verse reference popup** — hover popover on cross-references showing verse text (from HelloAO)
- **Sticky chunk navigation** — Previous/Next chunk buttons should be sticky, not only at the bottom

### Home Page
- **Search/filter projects** — text filter on the project list
- **Sort options** — sort by name, date, or passage
- **Project rename** — title is only set at creation; allow renaming from home card
- **Last opened chunk** — resume directly to the study page, not the setup page

---

## Code Architecture

### State Management
- **`App.jsx` is ~2,250 lines** — biggest maintainability issue. Split into:
  - `pages/HomePage.jsx`
  - `pages/SetupPage.jsx`
  - `pages/StudyPage.jsx`
  - `components/ChunkEditor.jsx`
  - `components/GreekWordStudy.jsx`
  - `components/SuggestModal.jsx`
- **Custom hooks** — extract logic into `useProject()`, `useGreekLookup()`, `useAutosave()`

### Sync / Persistence
- **No auth** — the server has zero authentication. Any user who can reach the server can read/overwrite/delete any project. Add at minimum an API key (env var in middleware) or user accounts
- **Conflict resolution is basic** — only compares `lastEdited` timestamps. Add a "which version do you want to keep?" UI to prevent silent data loss
- **Offline-first** — use a service worker / `workbox` so the app works offline and syncs when back online

### Security (OWASP)
- **XSS via `dangerouslySetInnerHTML`** — `word.definitionHtml` is rendered raw. Add DOMPurify sanitization
- **No input validation on server** — add max-length and character validation on `id`/`title` fields (SQL injection is prevented by parameterized queries, but still)
- **CORS** — server has no CORS headers; any origin can call the API in production

---

## Performance

- **Verse data stored in project JSON** — full verse text is saved in localStorage and SQLite for every chapter. For multi-chapter projects this grows large. Consider storing only the chapter reference and re-fetching verses on load
- **JSON files cached in refs** — `nt-strongs-gloss.json` and `nt-strongs-concordance.json` should be served with proper `Cache-Control` headers
- **Autosave fires on all state changes** — the `[project]` dependency is too broad; it fires even when just selecting a chunk. Debounce only on content field changes

---

## Testing

- Add tests for:
  - `migrateProject` with the old flat format
  - `buildClaudePrompt` output structure
  - `parseBibleChapter` with both API response shapes
  - Autosave debounce behavior

---

## Developer Experience

- **No ESLint config** — add ESLint with `eslint-plugin-react` and `eslint-plugin-react-hooks` to catch missing `useEffect` deps
- **No TypeScript** — JSDoc types or a TS migration would catch shape mismatches between old/new project formats at compile time
- **No `docker-compose.yml`** — Dockerfile exists but there's no compose file for one-command local dev with server + SQLite volume
