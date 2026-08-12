import { useApp } from '../context/AppContext.js';
import { bookOptions, formatChunkReference } from '../App.jsx';

function SetupForm({ setup, availableTranslations, titleEdited, loadingChapter, errorMessage, hideTitle, onField, onTitleChange, onLoad }) {
  return (
    <div className="space-y-6">
      {!hideTitle && (
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Project Setup</h2>
          <p className="mt-2 text-sm text-slate-600">
            Pick a translation, chapter, and title. Load the chapter to begin structuring your study into chunks.
          </p>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Translation
          <select
            value={setup.translation}
            onChange={(e) => onField('translation', e.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {availableTranslations.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Book
          <select
            value={setup.bookAbbrev}
            onChange={(e) => onField('book', e.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {bookOptions.map((book) => (
              <option key={book.abbrev} value={book.abbrev}>{book.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Chapter
          <input
            type="number"
            min="1"
            value={setup.chapter}
            onChange={(e) => onField('chapter', e.target.value)}
            className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
          />
        </label>
        {!hideTitle && (
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Project title
            <input
              type="text"
              value={setup.title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          {errorMessage
            ? <span className="text-rose-500">{errorMessage}</span>
            : 'Start by loading the chapter text from HelloAO.'}
        </div>
        <button
          type="button"
          onClick={onLoad}
          disabled={loadingChapter}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {loadingChapter ? 'Loading...' : 'Load Chapter'}
        </button>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const {
    headerButtons,
    project,
    setup,
    availableTranslations,
    titleEdited, setTitleEdited,
    activeChapterIndex, setActiveChapterIndex,
    activeChapter,
    showAddChapterForm, setShowAddChapterForm,
    rangeStart, setRangeStart,
    rangeEnd, setRangeEnd,
    verseSearch, setVerseSearch,
    typedChunkStart, setTypedChunkStart,
    typedChunkEnd, setTypedChunkEnd,
    typedChunkNextEnd, setTypedChunkNextEnd,
    typedChunkBulk, setTypedChunkBulk,
    clickedSpanNextEnd, setClickedSpanNextEnd,
    loadingChapter,
    errorMessage,
    statusMessage,
    allChunks,
    handleSetupField,
    handleLoadChapter,
    beginStudying,
    handleVerseClick,
    addTypedChunk,
    addBulkTypedChunks,
    addClickSpanChunk,
    moveChunk,
    deleteChunk,
    updateProject,
  } = useApp();

  const chapterTabs = project?.chapters ?? [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">
              {project ? project.title : 'New Study'}
            </h1>
          </div>
          {headerButtons}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Project setup form — shown when no project loaded yet */}
        {!project && (
          <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
            <SetupForm
              setup={setup}
              availableTranslations={availableTranslations}
              titleEdited={titleEdited}
              loadingChapter={loadingChapter}
              errorMessage={errorMessage}
              onField={handleSetupField}
              onTitleChange={(val) => { setTitleEdited(true); handleSetupField('title', val); }}
              onLoad={handleLoadChapter}
            />
          </section>
        )}

        {/* Chapter tabs + verse/chunk editors */}
        {project && (
          <section className="space-y-6">
            {/* Chapter tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {chapterTabs.map((ch, idx) => (
                <button
                  key={`${ch.bookAbbrev}-${ch.chapter}`}
                  type="button"
                  onClick={() => { setActiveChapterIndex(idx); setRangeStart(null); setRangeEnd(null); }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    activeChapterIndex === idx
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {ch.book} {ch.chapter}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAddChapterForm((v) => !v)}
                className="rounded-full border border-dashed border-slate-400 px-4 py-1.5 text-sm text-slate-500 transition hover:border-slate-600 hover:text-slate-700"
              >
                + Add Chapter
              </button>
            </div>

            {/* Add-chapter form */}
            {showAddChapterForm && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Add another chapter</h3>
                <SetupForm
                  setup={setup}
                  availableTranslations={availableTranslations}
                  titleEdited={titleEdited}
                  loadingChapter={loadingChapter}
                  errorMessage={errorMessage}
                  hideTitle
                  onField={handleSetupField}
                  onTitleChange={(val) => { setTitleEdited(true); handleSetupField('title', val); }}
                  onLoad={handleLoadChapter}
                />
              </div>
            )}

            {/* Verse + chunk panel for active chapter */}
            {activeChapter && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Scripture & Chunks</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {activeChapter.book} {activeChapter.chapter} ({project.translation})
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    {statusMessage || 'Click/shift-click, or type a verse range, to create a chunk.'}
                  </div>
                </div>
                <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                  <div className="min-w-0 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-600">Chapter verses</span>
                      <span className="text-xs text-slate-500">Click a verse, then shift-click an end verse.</span>
                    </div>
                    <input
                      type="text"
                      value={verseSearch}
                      onChange={(e) => setVerseSearch(e.target.value)}
                      placeholder="Search verses in this chapter…"
                      className="mb-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                    <div data-testid="verse-list" className="max-h-[520px] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 scrollbar-thin">
                      {activeChapter.verses
                        .filter((verse) => verse.text.toLowerCase().includes(verseSearch.trim().toLowerCase()))
                        .map((verse) => {
                        const inRange =
                          rangeStart !== null &&
                          verse.number >= Math.min(rangeStart, rangeEnd) &&
                          verse.number <= Math.max(rangeStart, rangeEnd);
                        const inOwnChapterChunk = activeChapter.chunks.some(
                          (chunk) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse,
                        );
                        const prevChapter = project?.chapters?.[activeChapterIndex - 1] ?? null;
                        const inPrevChapterSpillover = prevChapter
                          ? prevChapter.chunks.some((chunk) =>
                            Number.isInteger(chunk.spilloverEndVerse)
                            && prevChapter.bookAbbrev === activeChapter.bookAbbrev
                            && verse.number <= chunk.spilloverEndVerse
                          )
                          : false;
                        const inChunk = inOwnChapterChunk || inPrevChapterSpillover;
                        return (
                          <button
                            key={verse.number}
                            type="button"
                            onClick={(event) => handleVerseClick(verse.number, event)}
                            className={`group mb-2 w-full rounded-3xl px-4 py-3 text-left transition ${
                              inRange ? 'bg-sky-100 ring-1 ring-sky-200' : inChunk ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 transition group-hover:bg-slate-300">
                              {verse.number}
                            </span>
                            <span className="ml-3 text-sm leading-relaxed text-slate-700">{verse.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="min-w-0 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">Chunks</h3>
                      <span className="text-xs text-slate-500">{activeChapter.chunks.length} created</span>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type chunk range</p>
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <label className="min-w-0 flex-1 text-xs text-slate-500">
                          Start
                          <input
                            type="number"
                            min="1"
                            max={activeChapter.verses.at(-1)?.number ?? 1}
                            value={typedChunkStart}
                            onChange={(e) => setTypedChunkStart(e.target.value)}
                            className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                          />
                        </label>
                        <label className="min-w-0 flex-1 text-xs text-slate-500">
                          End
                          <input
                            type="number"
                            min="1"
                            max={activeChapter.verses.at(-1)?.number ?? 1}
                            value={typedChunkEnd}
                            onChange={(e) => setTypedChunkEnd(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTypedChunk();
                              }
                            }}
                            className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                          />
                        </label>
                        <label className="min-w-0 flex-1 text-xs text-slate-500">
                          Next ch end (optional)
                          <input
                            type="number"
                            min="1"
                            max={project?.chapters?.[activeChapterIndex + 1]?.verses?.at(-1)?.number ?? 1}
                            value={typedChunkNextEnd}
                            onChange={(e) => setTypedChunkNextEnd(e.target.value)}
                            placeholder="e.g. 5"
                            className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={addTypedChunk}
                          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Add
                        </button>
                      </div>
                      <div className="mt-3">
                        <label className="text-xs text-slate-500">
                          Bulk ranges (comma/new line; use `start-end:nextEnd` to span)
                          <textarea
                            rows={2}
                            value={typedChunkBulk}
                            onChange={(e) => setTypedChunkBulk(e.target.value)}
                            placeholder="1-6, 7-31:5, 6"
                            className="mt-1 block w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={addBulkTypedChunks}
                          className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Add All Ranges
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Click-based chapter span</p>
                      <p className="mt-1 text-xs text-slate-500">Click a start verse in this chapter, then choose where to end in the next chapter.</p>
                      <div className="mt-2 flex items-end gap-2">
                        <div className="flex-1 text-xs text-slate-500">
                          Start
                          <div className="mt-1 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-900">
                            {rangeStart ?? 'Not selected'}
                          </div>
                        </div>
                        <label className="flex-1 text-xs text-slate-500">
                          Next ch end
                          <input
                            type="number"
                            min="1"
                            max={project?.chapters?.[activeChapterIndex + 1]?.verses?.at(-1)?.number ?? 1}
                            value={clickedSpanNextEnd}
                            onChange={(e) => setClickedSpanNextEnd(e.target.value)}
                            placeholder="e.g. 5"
                            className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={addClickSpanChunk}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          Span Into Next
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-thin">
                      {activeChapter.chunks.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                          No chunks yet. Select verse ranges to add sections.
                        </div>
                      ) : (
                        activeChapter.chunks.map((chunk, index) => (
                          <div
                            key={chunk.id}
                            className={`rounded-3xl border p-4 ${project.selectedChunkId === chunk.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'} shadow-sm`}
                          >
                            <button
                              type="button"
                              onClick={() => updateProject((current) => ({ ...current, selectedChunkId: chunk.id }))}
                              className="mb-3 w-full text-left"
                            >
                              <p className="text-sm font-semibold text-slate-900">
                                {formatChunkReference(project, activeChapterIndex, chunk, '–')}
                              </p>
                              <p className="mt-1 text-sm text-slate-600 truncate">
                                {activeChapter.verses.find((v) => v.number === chunk.startVerse)?.text || ''}
                              </p>
                            </button>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <button
                                type="button"
                                onClick={() => moveChunk(chunk.id, -1)}
                                disabled={index === 0}
                                className="rounded-full border border-slate-300 bg-white px-2 py-1 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveChunk(chunk.id, 1)}
                                disabled={index === activeChapter.chunks.length - 1}
                                className="rounded-full border border-slate-300 bg-white px-2 py-1 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteChunk(chunk.id)}
                                className="rounded-full border border-rose-300 bg-rose-50 px-2 py-1 text-rose-600 transition hover:bg-rose-100"
                              >
                                × Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={beginStudying}
                disabled={allChunks.length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                Begin Studying →
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
