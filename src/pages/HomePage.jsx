import { useState } from 'react';
import { useApp } from '../context/AppContext.js';
import { bookOptions, CHAPTER_COUNTS, formatRelativeDate } from '../App.jsx';

export default function HomePage() {
  const {
    authStatus,
    autoRestoredCount,
    staleLocalProjects,
    projectIndex,
    homeSearch, setHomeSearch,
    homeSort, setHomeSort,
    homeTagFilter, setHomeTagFilter,
    homeFullTextResults,
    readingPlan,
    createReadingPlan,
    clearReadingPlan,
    audioBook, setAudioBook,
    audioNarrator, setAudioNarrator,
    audioState,
    renamingId, setRenamingId,
    renameValue, setRenameValue,
    openBibleReader,
    openImportProject,
    openNewProject,
    pullLatestFromServer,
    resumeProject,
    renameProjectInStorage,
    deleteProject,
    handlePlayBookAudio,
    handleStopBookAudio,
    handleToggleBookAudioPause,
  } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-1 text-2xl font-semibold">My Studies</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openBibleReader}
              className="rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              📖 Read Bible
            </button>
            <button
              type="button"
              onClick={openImportProject}
              className="rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <span className="hidden sm:inline">📥 Import Session List</span>
              <span className="sm:hidden">📥 Import</span>
            </button>
            <button
              type="button"
              onClick={openNewProject}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              + New Project
            </button>
            {authStatus}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8">
        {autoRestoredCount !== null && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              📥 Synced {autoRestoredCount} project{autoRestoredCount > 1 ? 's' : ''} from another device.
            </p>
          </div>
        )}
        {staleLocalProjects.length > 0 && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-3 text-sm font-semibold text-amber-800">
              ☁️ {staleLocalProjects.length} project{staleLocalProjects.length > 1 ? 's have' : ' has'} a newer version on the server:
            </p>
            <div className="flex flex-wrap gap-2">
              {staleLocalProjects.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => pullLatestFromServer(entry.id)}
                  className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
                >
                  Pull latest "{entry.title}"
                </button>
              ))}
            </div>
          </div>
        )}
        {projectIndex.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-panel">
            <p className="text-lg font-semibold text-slate-700">No projects yet</p>
            <p className="mt-2 text-sm text-slate-500">Start a new Bible study to get going.</p>
            <button
              type="button"
              onClick={openNewProject}
              className="mt-6 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              + New Project
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                type="text"
                value={homeSearch}
                onChange={(e) => setHomeSearch(e.target.value)}
                placeholder="Search projects by title or passage…"
                className="w-full max-w-sm rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <label className="text-sm text-slate-600">
                Sort by{' '}
                <select
                  value={homeSort}
                  onChange={(e) => setHomeSort(e.target.value)}
                  className="ml-1 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  <option value="recent">Last edited</option>
                  <option value="title">Title</option>
                  <option value="passage">Passage</option>
                </select>
              </label>
              {(() => {
                const allTags = Array.from(
                  new Set(projectIndex.flatMap((entry) => entry.tags ?? [])),
                ).sort((a, b) => a.localeCompare(b));
                if (allTags.length === 0) return null;
                return (
                  <label className="text-sm text-slate-600">
                    Tag{' '}
                    <select
                      value={homeTagFilter}
                      onChange={(e) => setHomeTagFilter(e.target.value)}
                      className="ml-1 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="">All tags</option>
                      {allTags.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </label>
                );
              })()}
            </div>
            {/* Full-text note search results */}
            {homeFullTextResults !== null && (
              <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  {homeFullTextResults.length === 0
                    ? 'No notes match your search.'
                    : `Notes matching "${homeSearch.trim()}" — ${homeFullTextResults.reduce((n, r) => n + r.matches.length, 0)} result${homeFullTextResults.reduce((n, r) => n + r.matches.length, 0) !== 1 ? 's' : ''} across ${homeFullTextResults.length} project${homeFullTextResults.length !== 1 ? 's' : ''}`}
                </p>
                <div className="space-y-4">
                  {homeFullTextResults.map(({ projectId, projectTitle, matches }) => (
                    <div key={projectId}>
                      <button
                        type="button"
                        onClick={() => resumeProject(projectId)}
                        className="mb-1.5 text-sm font-semibold text-violet-700 hover:underline"
                      >
                        {projectTitle} →
                      </button>
                      <div className="space-y-1.5">
                        {matches.map(({ chunkId, ref, field, snippet }) => (
                          <div key={chunkId} className="rounded-2xl bg-slate-50 px-3 py-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{ref} · {field}</span>
                            <p className="mt-0.5 text-sm text-slate-700 leading-snug">{snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reading plan card */}
            <ReadingPlanCard readingPlan={readingPlan} createReadingPlan={createReadingPlan} clearReadingPlan={clearReadingPlan} openBibleReader={openBibleReader} />

            <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900">Listen to BSB Audio</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {audioState.status === 'idle' || audioState.status === 'error'
                    ? 'Play a full book of the Berean Standard Bible.'
                    : `Playing ${bookOptions.find((b) => b.abbrev === audioBook)?.name} — chapter ${audioState.chapter} of ${audioState.total}`}
                </p>
                {audioState.status === 'error' && (
                  <p className="mt-1 text-sm text-rose-600">Couldn't load audio for this book/narrator.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={audioBook}
                  onChange={(e) => setAudioBook(e.target.value)}
                  disabled={audioState.status === 'playing' || audioState.status === 'paused'}
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
                >
                  {bookOptions.map((book) => (
                    <option key={book.abbrev} value={book.abbrev}>{book.name}</option>
                  ))}
                </select>
                <select
                  value={audioNarrator}
                  onChange={(e) => setAudioNarrator(e.target.value)}
                  disabled={audioState.status === 'playing' || audioState.status === 'paused'}
                  className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
                >
                  <option value="david">David</option>
                  <option value="hays">Hays</option>
                  <option value="souer">Souer</option>
                </select>
                {audioState.status === 'playing' || audioState.status === 'paused' ? (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleBookAudioPause}
                      className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
                    >
                      {audioState.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={handleStopBookAudio}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Stop
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlayBookAudio}
                    className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
                  >
                    Play book
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projectIndex
              .slice()
              .filter((entry) => {
                if (homeTagFilter && !(entry.tags ?? []).includes(homeTagFilter)) return false;
                const q = homeSearch.trim().toLowerCase();
                if (!q) return true;
                return entry.title?.toLowerCase().includes(q)
                  || entry.chapterSummary?.toLowerCase().includes(q);
              })
              .sort((a, b) => {
                if (homeSort === 'title') return (a.title ?? '').localeCompare(b.title ?? '');
                if (homeSort === 'passage') return (a.chapterSummary ?? '').localeCompare(b.chapterSummary ?? '');
                return (b.lastEdited ?? 0) - (a.lastEdited ?? 0);
              })
              .map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel"
                >
                  <div className="flex-1">
                    {renamingId === entry.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const trimmed = renameValue.trim();
                              if (trimmed) renameProjectInStorage(entry.id, trimmed);
                              setRenamingId(null);
                            } else if (e.key === 'Escape') {
                              setRenamingId(null);
                            }
                          }}
                          className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-base font-semibold text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = renameValue.trim();
                            if (trimmed) renameProjectInStorage(entry.id, trimmed);
                            setRenamingId(null);
                          }}
                          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="text-sm text-slate-400 hover:text-slate-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-base font-semibold text-slate-900">{entry.title}</h2>
                        <button
                          type="button"
                          onClick={() => { setRenamingId(entry.id); setRenameValue(entry.title ?? ''); }}
                          className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
                          title="Rename project"
                        >
                          ✎ Rename
                        </button>
                      </div>
                    )}
                    {entry.chapterSummary && (
                      <p className="mt-1 text-sm text-slate-500">{entry.chapterSummary}</p>
                    )}
                    {entry.tags?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeDate(entry.lastEdited)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resumeProject(entry.id)}
                      className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProject(entry.id)}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ReadingPlanCard({ readingPlan, createReadingPlan, clearReadingPlan, openBibleReader }) {
  const [showForm, setShowForm] = useState(false);
  const [planBook, setPlanBook] = useState(bookOptions[0].abbrev);
  const [planWeeks, setPlanWeeks] = useState(4);

  if (readingPlan) {
    const pct = readingPlan.totalChapters > 0
      ? Math.round((readingPlan.chaptersRead.length / readingPlan.totalChapters) * 100)
      : 0;
    const daysLeft = Math.max(0, Math.ceil((readingPlan.targetDate - Date.now()) / 86400000));
    const chapLeft = readingPlan.totalChapters - readingPlan.chaptersRead.length;
    const paceNeeded = daysLeft > 0 ? (chapLeft / daysLeft).toFixed(1) : '—';
    return (
      <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">Reading Plan</p>
            <h3 className="mt-1 text-base font-semibold text-slate-900">{readingPlan.bookName}</h3>
            <p className="mt-0.5 text-sm text-slate-600">
              {readingPlan.chaptersRead.length} / {readingPlan.totalChapters} chapters · {daysLeft} day{daysLeft !== 1 ? 's' : ''} left · {paceNeeded} ch/day needed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openBibleReader}
              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Read
            </button>
            <button
              type="button"
              onClick={() => { if (window.confirm('Clear reading plan?')) clearReadingPlan(); }}
              className="rounded-xl border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-emerald-200">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-right text-xs text-emerald-700">{pct}%</p>
        {readingPlan.chaptersRead.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Read: ch. {readingPlan.chaptersRead.slice(0, 12).join(', ')}{readingPlan.chaptersRead.length > 12 ? '…' : ''}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-panel">
      {showForm ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Read</span>
          <select
            value={planBook}
            onChange={(e) => setPlanBook(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {bookOptions.map((b) => (
              <option key={b.abbrev} value={b.abbrev}>{b.name} ({CHAPTER_COUNTS[b.abbrev] ?? '?'} ch)</option>
            ))}
          </select>
          <span className="text-sm text-slate-600">in</span>
          <select
            value={planWeeks}
            onChange={(e) => setPlanWeeks(Number(e.target.value))}
            className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {[1,2,3,4,6,8,12,16,26,52].map((w) => <option key={w} value={w}>{w} week{w !== 1 ? 's' : ''}</option>)}
          </select>
          <button
            type="button"
            onClick={() => {
              const book = bookOptions.find((b) => b.abbrev === planBook);
              createReadingPlan(planBook, book?.name ?? planBook, planWeeks);
              setShowForm(false);
            }}
            className="rounded-xl bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Start plan
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Reading Plan</p>
            <p className="text-xs text-slate-500">Set a goal to read through a book, track chapters as you go.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Set goal
          </button>
        </div>
      )}
    </div>
  );
}
