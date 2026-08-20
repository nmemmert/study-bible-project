import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { useApp } from '../context/AppContext.js';
import { STUDY_TABS, COMMENTARY_OPTIONS, NT_BOOK_NUMBER, formatChunkReference, CrossRefChip } from '../App.jsx';
import DrawCanvas from './DrawCanvas.jsx';

export default function StudyPage() {
  const {
    headerButtons,
    project,
    allChunks,
    selectedChunk,
    selectedChunkChapterIndex,
    selectedChunkChapter,
    selectedChunkVerses,
    selectedChunkGlobalIndex,
    studyLayout, setStudyLayout,
    activeStudyTab, setActiveStudyTab,
    mobileStudyTab, setMobileStudyTab,
    collapsedSections, setCollapsedSections,
    interlinearData,
    interlinearLoading,
    interlinearError,
    commentarySource, setCommentarySource,
    commentaryData,
    commentaryLoading,
    commentaryError,
    crossRefInput, setCrossRefInput,
    suggestingCrossRefs,
    crossRefSuggestions,
    tagInput, setTagInput,
    suggestModal, setSuggestModal,
    suggestSelection, setSuggestSelection,
    suggestingGreekForChunkId,
    suggestingHebrewForChunkId,
    projectIndex,
    goToPreviousChunk,
    goToNextChunk,
    updateProject,
    updateChunk,
    addCrossRef,
    removeCrossRef,
    suggestCrossRefsForChunk,
    addSuggestedCrossRef,
    addTag,
    removeTag,
    addGreekWord,
    removeGreekWord,
    updateChunkWord,
    lookupWord,
    suggestGreekWordsForChunk,
    suggestHebrewWordsForChunk,
    confirmSuggestWords,
    speakOriginalWord,
    externalLookupLinks,
    buildGreekDefinitionHtml,
    loadVerseText,
    importFinalScriptDocx,
    formatChunkReference: _ignored,
  } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">{project?.title ?? ''}</h1>
            {selectedChunk && selectedChunkChapterIndex >= 0 && (
              <p className="mt-1 text-sm text-slate-300">
                {formatChunkReference(project, selectedChunkChapterIndex, selectedChunk, '–')}
              </p>
            )}
          </div>
          {headerButtons}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 pb-20 sm:py-8 sm:pb-20 sm:px-6 lg:px-8">
        <section className={`grid min-w-0 gap-6 ${studyLayout === 'split' ? '' : 'lg:grid-cols-[260px_1fr]'}`}>
          {/* Sidebar */}
          <aside className={`min-w-0 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-panel max-sm:hidden ${studyLayout === 'split' ? 'hidden' : ''}`}>
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-500">Chunk Navigation</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{allChunks.length} chunks</h2>
            </div>
            {allChunks.length > 6 && (
              <label className="mb-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Jump to chunk
                <select
                  value={project?.selectedChunkId ?? ''}
                  onChange={(e) => updateProject((current) => ({ ...current, selectedChunkId: e.target.value }))}
                  className="mt-1 block w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm font-normal normal-case text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  {project?.chapters.map((ch, chapterIndex) =>
                    ch.chunks.map((chunk) => (
                      <option key={chunk.id} value={chunk.id}>
                        {formatChunkReference(project, chapterIndex, chunk, '–')}
                      </option>
                    )),
                  )}
                </select>
              </label>
            )}
            <div className="space-y-6 max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin">
              {project?.chapters.map((ch, chapterIndex) => (
                <div key={`${ch.bookAbbrev}-${ch.chapter}`}>
                  {project.chapters.length > 1 && (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {ch.book} {ch.chapter}
                    </p>
                  )}
                  <div className="space-y-2">
                    {ch.chunks.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                        No chunks in this chapter.
                      </div>
                    ) : (
                      ch.chunks.map((chunk) => {
                        const isSelected = project.selectedChunkId === chunk.id;
                        const hasContent =
                          (chunk.observation ?? '').trim() ||
                          (chunk.interpretation ?? '').trim() ||
                          (chunk.application ?? '').trim() ||
                          chunk.greekWords.length > 0;
                        return (
                          <button
                            type="button"
                            key={chunk.id}
                            onClick={() => updateProject((current) => ({ ...current, selectedChunkId: chunk.id }))}
                            className={`group flex w-full flex-col gap-1 rounded-3xl border-l-4 p-3 text-left transition ${
                              isSelected
                                ? 'border-amber-400 bg-amber-50'
                                : 'border-transparent border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-900">
                                {formatChunkReference(project, chapterIndex, chunk, '–')}
                              </span>
                              {hasContent ? <span className="text-emerald-600">✓</span> : null}
                            </div>
                            <p className="text-xs leading-relaxed text-slate-600 truncate">
                              {ch.verses.find((v) => v.number === chunk.startVerse)?.text || ''}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Chunk editor */}
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Chunk editor</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedChunk
                    ? `Section ${formatChunkReference(project, selectedChunkChapterIndex, selectedChunk, '–')}`
                    : 'Select a chunk'}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedChunk && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousChunk}
                      disabled={selectedChunkGlobalIndex <= 0}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ‹ Prev
                    </button>
                    <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                      {`Chunk ${selectedChunkGlobalIndex + 1} of ${allChunks.length}`}
                    </div>
                    <button
                      type="button"
                      onClick={goToNextChunk}
                      disabled={selectedChunkGlobalIndex >= allChunks.length - 1}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next ›
                    </button>
                  </>
                )}
                {!selectedChunk && (
                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                    Choose a chunk to study.
                  </div>
                )}
                <div className="max-sm:hidden flex divide-x divide-slate-200 overflow-hidden rounded-2xl border border-slate-300">
                  {[
                    { id: 'stacked', label: '☰ Stacked' },
                    { id: 'split', label: '◫ Split' },
                    { id: 'annotate', label: '✏ Draw' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setStudyLayout(m.id)}
                      className={`px-3 py-2 text-sm font-semibold transition ${
                        studyLayout === m.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile tab bar */}
            <div className="sm:hidden -mx-4 mt-4 flex overflow-x-auto border-b border-slate-200">
              {[
                { id: 'scripture', label: 'Scripture' },
                { id: 'notes', label: 'Notes' },
                { id: 'crossRefs', label: 'Refs' },
                { id: 'wordStudy', label: 'Words' },
                { id: 'commentary', label: 'Commentary' },
                { id: 'script', label: 'Script' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileStudyTab(tab.id)}
                  className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                    mobileStudyTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {selectedChunk ? (
              <div className="mt-6 space-y-6">
              {studyLayout === 'annotate' ? (
                <DrawCanvas
                  strokes={selectedChunk.inkStrokes ?? []}
                  onStrokesChange={(s) => updateChunk(selectedChunk.id, { inkStrokes: s })}
                  onDone={() => setStudyLayout('stacked')}
                  headerContent={
                    <>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Scripture · draw on me</span>
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {formatChunkReference(project, selectedChunkChapterIndex, selectedChunk, '–')}
                        </span>
                      </div>
                      {selectedChunkVerses.map((verse) => (
                        <p key={`${verse.chapter}-${verse.number}`} className="mb-1">
                          <span className="font-semibold text-slate-900">{verse.chapter}:{verse.number}.</span>{' '}
                          {verse.text}
                        </p>
                      ))}
                    </>
                  }
                />
              ) : (
              <div className={`space-y-6 ${studyLayout === 'split' ? 'lg:flex lg:items-start lg:gap-6 lg:space-y-0' : ''}`}>
                {/* Scripture */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'scripture' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' ? 'lg:sticky lg:top-6 lg:flex-1 lg:basis-0 lg:min-w-0 lg:self-start' : ''}`}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Scripture</p>
                      <p className="text-xs text-slate-500">Read-only passage for the selected chunk.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {formatChunkReference(project, selectedChunkChapterIndex, selectedChunk, '–')}
                    </span>
                  </div>
                  <div className="space-y-3 font-serif text-slate-800">
                    {selectedChunkVerses
                      .map((verse) => (
                        <p key={`${verse.chapter}-${verse.number}`} className="leading-relaxed">
                          <span className="font-semibold text-slate-700">{verse.chapter}:{verse.number}.</span> {verse.text}
                        </p>
                      ))}
                  </div>

                  {/* Interlinear */}
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={() => setCollapsedSections((c) => ({ ...c, interlinear: !c.interlinear }))}
                      className="mb-2 flex w-full items-center justify-between gap-2 text-left"
                    >
                      <h3 className="text-sm font-semibold text-slate-900">Interlinear</h3>
                      <span className="text-slate-400">{collapsedSections.interlinear ? '▸' : '▾'}</span>
                    </button>
                    {!collapsedSections.interlinear && (
                      <div
                        className="space-y-2 font-serif text-slate-800"
                        dir={selectedChunkChapter && !NT_BOOK_NUMBER[selectedChunkChapter.bookAbbrev] ? 'rtl' : 'ltr'}
                      >
                        {interlinearLoading && <p className="text-sm font-sans text-slate-500">Loading interlinear text...</p>}
                        {interlinearError && <p className="text-sm font-sans text-rose-500">{interlinearError}</p>}
                        {!interlinearLoading && !interlinearError && interlinearData
                          && Array.from(
                            { length: selectedChunk.endVerse - selectedChunk.startVerse + 1 },
                            (_, i) => selectedChunk.startVerse + i,
                          )
                            .filter((num) => interlinearData[String(num)])
                            .map((num) => (
                              <div key={num} className="leading-relaxed">
                                <span className="font-sans font-semibold text-slate-700">{selectedChunkChapter.chapter}:{num}.</span>{' '}
                                <span className="mt-1 inline-flex flex-wrap gap-x-3 gap-y-2 align-top">
                                  {interlinearData[String(num)].map((w, i) => (
                                    <span key={i} className="inline-flex flex-col items-center text-center" title={[w.t, w.s, w.p].filter(Boolean).join(' · ')}>
                                      <span className="text-base">{w.o}</span>
                                      <span className="font-sans text-[11px] leading-tight text-slate-500">{w.g || '—'}</span>
                                    </span>
                                  ))}
                                </span>
                              </div>
                            ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right column (study panels) */}
                <div className={`space-y-6 ${studyLayout === 'split' ? 'lg:flex-1 lg:basis-0 lg:min-w-0' : ''}`}>
                {studyLayout === 'split' && (
                  <div className="sticky top-0 z-10 flex flex-wrap gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                    {STUDY_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveStudyTab(tab.id)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                          activeStudyTab === tab.id
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Session metadata */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'notes' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
                  <h3 className="text-sm font-semibold text-slate-900">Session Info</h3>
                  <p className="text-xs text-slate-500">
                    Optional — only fill this in if this chunk is part of a numbered series (a podcast episode,
                    sermon, or class session). Used to label it in exports and in "Prepare for Podcast."
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={selectedChunk?.episodeNumber ?? ''}
                      onChange={(e) => updateChunk(selectedChunk.id, { episodeNumber: e.target.value })}
                      placeholder="Session #"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 sm:w-32"
                    />
                    <input
                      type="text"
                      value={selectedChunk?.episodeTitle ?? ''}
                      onChange={(e) => updateChunk(selectedChunk.id, { episodeTitle: e.target.value })}
                      placeholder="Session title"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                {/* Background / general notes */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'notes' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, generalNotes: !c.generalNotes }))}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Background / General Notes</h3>
                      <p className="text-xs text-slate-500">Context, history, authorship, themes for this chunk.</p>
                    </div>
                    <span className="text-slate-400">{collapsedSections.generalNotes ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedSections.generalNotes && (
                    <textarea
                      value={selectedChunk?.generalNotes ?? ''}
                      onChange={(e) => updateChunk(selectedChunk.id, { generalNotes: e.target.value })}
                      rows={4}
                      placeholder="e.g. author, date, audience, historical context, key themes…"
                      className="mt-4 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  )}
                </div>

                {/* OIA Notes */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4 ${mobileStudyTab !== 'notes' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, oia: !c.oia }))}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Study Notes (OIA)</h3>
                      <p className="text-xs text-slate-500">Observation · Interpretation · Application</p>
                    </div>
                    <span className="text-slate-400">{collapsedSections.oia ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedSections.oia && [
                    {
                      field: 'observation',
                      label: 'Observation',
                      placeholder: "What does the text actually say?\n• Who is speaking, and to whom?\n• What key words or phrases repeat?\n• What's the tone, structure, or literary style?",
                    },
                    {
                      field: 'interpretation',
                      label: 'Interpretation',
                      placeholder: "What did this mean to its original audience?\n• What's the historical/cultural context?\n• How does it fit the surrounding argument?\n• What does it reveal about God's character?",
                    },
                    {
                      field: 'application',
                      label: 'Application',
                      placeholder: 'How should this shape your life today?\n• What attitude or action does this call for?\n• Is there a promise to trust or a warning to heed?\n• Who could you share this with?',
                    },
                  ].map(({ field, label, placeholder }) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </label>
                      <textarea
                        value={selectedChunk[field] ?? ''}
                        onChange={(e) => updateChunk(selectedChunk.id, { [field]: e.target.value })}
                        rows={4}
                        placeholder={placeholder}
                        className="w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                      />
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'notes' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
                  <h3 className="text-sm font-semibold text-slate-900">Tags</h3>
                  <p className="mb-3 text-xs text-slate-500">Label this chunk by topic so you can search across studies later.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {(selectedChunk.tags ?? []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(selectedChunk.id, tag)}
                          className="text-indigo-400 transition hover:text-indigo-700"
                          aria-label={`Remove tag ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); addTag(selectedChunk.id); }
                      }}
                      placeholder="Add a tag and press Enter"
                      list="tag-suggestions"
                      className="min-w-[10rem] flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                  {(() => {
                    const used = new Set((selectedChunk.tags ?? []).map((t) => t.toLowerCase()));
                    const allTags = Array.from(
                      new Set([
                        ...projectIndex.flatMap((entry) => entry.tags ?? []),
                        ...(project?.chapters ?? []).flatMap((ch) => ch.chunks ?? []).flatMap((c) => c.tags ?? []),
                      ]),
                    )
                      .filter((t) => !used.has(t.toLowerCase()))
                      .sort((a, b) => a.localeCompare(b));
                    if (allTags.length === 0) return null;
                    return (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-500">Suggestions:</span>
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => updateChunk(selectedChunk.id, { tags: [...(selectedChunk.tags ?? []), tag] })}
                            className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  <datalist id="tag-suggestions">
                    {Array.from(
                      new Set([
                        ...projectIndex.flatMap((entry) => entry.tags ?? []),
                        ...(project?.chapters ?? []).flatMap((ch) => ch.chunks ?? []).flatMap((c) => c.tags ?? []),
                      ]),
                    ).map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                </div>

                {/* Inline ink notes — collapsible, always available without switching to annotate mode */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'notes' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, inlineInk: !c.inlineInk }))}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Ink Notes</h3>
                      <p className="text-xs text-slate-500">Draw diagrams or handwritten notes for this chunk.</p>
                    </div>
                    <span className="text-slate-400">{collapsedSections.inlineInk ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedSections.inlineInk && (
                    <div className="mt-4">
                      <DrawCanvas
                        strokes={selectedChunk.inkStrokes ?? []}
                        onStrokesChange={(s) => updateChunk(selectedChunk.id, { inkStrokes: s })}
                        headerContent={
                          selectedChunkVerses.length > 0 && (
                            <>
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Scripture · draw on me</span>
                                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                  {formatChunkReference(project, selectedChunkChapterIndex, selectedChunk, '–')}
                                </span>
                              </div>
                              {selectedChunkVerses.map((verse) => (
                                <p key={`${verse.chapter}-${verse.number}`} className="mb-1">
                                  <span className="font-semibold text-slate-900">{verse.chapter}:{verse.number}.</span>{' '}
                                  {verse.text}
                                </p>
                              ))}
                            </>
                          )
                        }
                      />
                    </div>
                  )}
                </div>

                {/* Cross-references */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'crossRefs' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'crossRefs' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, crossRefs: !c.crossRefs }))}
                    className="mb-3 flex w-full items-center justify-between gap-2 text-left"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">Cross-References</h3>
                    <span className="text-slate-400">{collapsedSections.crossRefs ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedSections.crossRefs && <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={crossRefInput}
                      onChange={(e) => setCrossRefInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCrossRef(selectedChunk.id); } }}
                      placeholder="e.g. John 1:1 or Rom 3:23"
                      className="flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                    <button
                      type="button"
                      onClick={() => addCrossRef(selectedChunk.id)}
                      className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Add
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => suggestCrossRefsForChunk(selectedChunk.id)}
                    disabled={suggestingCrossRefs}
                    className="mt-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {suggestingCrossRefs ? 'Suggesting...' : '✨ Suggest from passage'}
                  </button>
                  {crossRefSuggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {crossRefSuggestions.map((ref) => (
                        <button
                          key={ref}
                          type="button"
                          onClick={() => addSuggestedCrossRef(selectedChunk.id, ref)}
                          className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-sm text-amber-700 transition hover:bg-amber-100"
                        >
                          + {ref}
                        </button>
                      ))}
                    </div>
                  )}
                  {(selectedChunk.crossReferences ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedChunk.crossReferences.map((ref) => (
                        <CrossRefChip
                          key={ref}
                          label={ref}
                          onRemove={() => removeCrossRef(selectedChunk.id, ref)}
                          loadVerseText={loadVerseText}
                        />
                      ))}
                    </div>
                  )}
                  </>}
                </div>

                {/* Greek/Hebrew word studies */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'wordStudy' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'wordStudy' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, greek: !c.greek }))}
                    className="mb-5 flex w-full items-center justify-between gap-4 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Word Studies (Greek/Hebrew)</h3>
                      <p className="text-sm text-slate-500">Add lexical notes, look up Strong's entries, and suggest words from the passage.</p>
                    </div>
                    <span className="text-slate-400 shrink-0">{collapsedSections.greek ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedSections.greek && <>
                  <div className="mb-5 flex items-center justify-end gap-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => suggestGreekWordsForChunk(selectedChunk.id)}
                        disabled={suggestingGreekForChunkId === selectedChunk.id}
                        className="rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 border border-amber-300 transition hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Auto-populate Greek words that actually appear in this passage"
                      >
                        {suggestingGreekForChunkId === selectedChunk.id ? 'Suggesting…' : '✦ Suggest from passage'}
                      </button>
                      <button
                        type="button"
                        onClick={() => suggestHebrewWordsForChunk(selectedChunk.id)}
                        disabled={suggestingHebrewForChunkId === selectedChunk.id}
                        className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800 border border-emerald-300 transition hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Suggest Hebrew words for Old Testament passages"
                      >
                        {suggestingHebrewForChunkId === selectedChunk.id ? 'Suggesting…' : '✦ Suggest Hebrew'}
                      </button>
                      <button
                        type="button"
                        onClick={() => addGreekWord(selectedChunk.id)}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Add Greek Word
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {selectedChunk.greekWords.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                        No words yet. Add one to begin a lookup.
                      </div>
                    ) : (
                      selectedChunk.greekWords.map((word) => (
                        <div key={word.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                            <label className="text-sm text-slate-600">
                              Strong's number or English gloss
                              <input
                                type="text"
                                value={word.query}
                                onChange={(e) => updateChunkWord(selectedChunk.id, word.id, { query: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); lookupWord(selectedChunk.id, word.id, 'greek'); }
                                }}
                                placeholder="G4102, H7225, 4102, or a word"
                                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </label>
                            <div className="flex items-end justify-between gap-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => lookupWord(selectedChunk.id, word.id, 'greek')}
                                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                                >
                                  {word.loading ? 'Looking up...' : 'Look Up Greek'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => lookupWord(selectedChunk.id, word.id, 'hebrew')}
                                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                                >
                                  {word.loading ? 'Looking up...' : 'Look Up Hebrew'}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeGreekWord(selectedChunk.id, word.id)}
                                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {word.strongNumber ? (
                            <div className="mt-3 flex items-center gap-2">
                              <span
                                className="group relative inline-flex cursor-default items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700"
                                title={word.shortDefinition || word.englishGloss || ''}
                              >
                                {word.strongNumber}
                                {(word.shortDefinition || word.englishGloss) && (
                                  <span className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden w-max max-w-xs rounded-xl bg-slate-900 px-3 py-2 text-xs font-normal leading-5 text-white shadow-lg group-hover:block">
                                    {word.shortDefinition || word.englishGloss}
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : null}
                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <label className="text-sm text-slate-600">
                              <span className="flex items-center gap-2">
                                {word.strongNumber?.startsWith('H') ? 'Hebrew word' : 'Greek word'}
                                {word.lexeme && (
                                  <button
                                    type="button"
                                    onClick={() => speakOriginalWord(word.lexeme, word.strongNumber)}
                                    className="rounded-lg bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 hover:bg-sky-200 transition"
                                    title="Hear pronunciation"
                                  >
                                    🔊 Speak
                                  </button>
                                )}
                              </span>
                              <input
                                type="text"
                                value={word.lexeme}
                                onChange={(e) => updateChunkWord(selectedChunk.id, word.id, { lexeme: e.target.value })}
                                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </label>
                            <label className="text-sm text-slate-600">
                              Transliteration
                              <input
                                type="text"
                                value={word.transliteration}
                                onChange={(e) => updateChunkWord(selectedChunk.id, word.id, { transliteration: e.target.value })}
                                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </label>
                            <label className="text-sm text-slate-600">
                              Part of speech
                              <input
                                type="text"
                                value={word.partOfSpeech}
                                onChange={(e) => updateChunkWord(selectedChunk.id, word.id, { partOfSpeech: e.target.value })}
                                placeholder="e.g. Noun"
                                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </label>
                          </div>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm text-slate-600">
                              English word
                              <input
                                type="text"
                                value={word.englishGloss ?? ''}
                                onChange={(e) => updateChunkWord(selectedChunk.id, word.id, { englishGloss: e.target.value })}
                                placeholder="e.g. grace"
                                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </label>
                            <label className="text-sm text-slate-600">
                              Short definition
                              <input
                                type="text"
                                value={word.shortDefinition}
                                onChange={(e) => updateChunkWord(selectedChunk.id, word.id, { shortDefinition: e.target.value })}
                                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </label>
                          </div>
                          {word.definitionHtml ? (
                            <details className="group mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                              <summary className="cursor-pointer text-sm font-semibold text-slate-900 transition hover:text-slate-700">
                                Extended definition
                              </summary>
                              <div
                                className="mt-3 text-sm leading-6 text-slate-700"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(word.definitionHtml) }}
                              />
                            </details>
                          ) : null}
                          {(word.shortDefinition === 'No definition found.' || word.shortDefinition === 'Lookup failed.') && !word.lexeme && !word.definitionHtml && word.query.trim() ? (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                              <p className="mb-2 text-xs font-semibold text-amber-800">
                                Not found in BDBT — look it up manually:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {externalLookupLinks(word.query).map(({ label, url }) => (
                                  <a
                                    key={label}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
                                  >
                                    {label} ↗
                                  </a>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(word.query.trim())}
                                  className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
                                >
                                  Copy "{word.query.trim()}"
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                  </>}
                </div>

                {/* Commentary */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'commentary' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'commentary' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, commentary: !c.commentary }))}
                    className="mb-3 flex w-full items-center justify-between gap-2 text-left"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">Commentary</h3>
                    <span className="text-slate-400">{collapsedSections.commentary ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedSections.commentary && <>
                    <select
                      value={commentarySource}
                      onChange={(e) => setCommentarySource(e.target.value)}
                      className="mb-3 block w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      {COMMENTARY_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {commentaryLoading && <p className="text-sm text-slate-500">Loading commentary...</p>}
                    {commentaryError && <p className="text-sm text-rose-500">{commentaryError}</p>}
                    {!commentaryLoading && !commentaryError && commentaryData && (() => {
                      const verses = (commentaryData.chapter?.content ?? []).filter(
                        (item) => item.type === 'verse'
                          && item.number >= selectedChunk.startVerse
                          && item.number <= selectedChunk.endVerse,
                      );
                      if (verses.length === 0) {
                        return <p className="text-sm text-slate-500">No commentary found for this verse range.</p>;
                      }
                      return (
                        <div className="space-y-4">
                          {verses.map((v) => (
                            <div key={v.number}>
                              <p className="text-sm font-semibold text-slate-700">Verse {v.number}</p>
                              {(v.content ?? []).map((p, i) => (
                                <p
                                  key={i}
                                  className="mt-1 text-sm text-slate-600 cursor-context-menu"
                                  title="Right-click to add to Background / General Notes"
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    const sourceName = COMMENTARY_OPTIONS.find((c) => c.id === commentarySource)?.name ?? commentarySource;
                                    const ref = formatChunkReference(project, selectedChunkChapterIndex, selectedChunk, '–');
                                    const citation = `${p} (${sourceName}, ${ref}:${v.number})`;
                                    const existing = selectedChunk.generalNotes ?? '';
                                    const next = existing ? `${existing}\n\n${citation}` : citation;
                                    updateChunk(selectedChunk.id, { generalNotes: next });
                                  }}
                                >
                                  {p}
                                </p>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>}
                </div>

                {/* Final episode script */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${mobileStudyTab !== 'script' ? 'max-sm:hidden' : ''} ${studyLayout === 'split' && activeStudyTab !== 'script' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, finalScript: !c.finalScript }))}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Final Script <span className="font-normal text-slate-400">(optional)</span></h3>
                      <p className="text-xs text-slate-500">Paste the finished script for this chunk once Claude has helped you write it — keeps the project as a complete archive. Useful for a podcast, sermon, or any spoken teaching, not required for personal study.</p>
                    </div>
                    <span className="text-slate-400">{collapsedSections.finalScript ? '▸' : '▾'}</span>
                  </button>
                  {!collapsedSections.finalScript && (
                    <>
                    <div className="mt-4 flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400">
                        ⬆ Upload .docx
                        <input
                          type="file"
                          accept=".docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            importFinalScriptDocx(selectedChunk.id, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <span className="text-xs text-slate-500">Replaces the text below with the document's text.</span>
                    </div>
                    <textarea
                      value={selectedChunk?.finalScript ?? ''}
                      onChange={(e) => updateChunk(selectedChunk.id, { finalScript: e.target.value })}
                      rows={8}
                      placeholder="Paste the final recorded/recordable script here…"
                      className="mt-4 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                    </>
                  )}
                </div>

                </div>
                </div>
              )}

              </div>
            ) : (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                <span className="sm:hidden">Use ‹ Prev / Next › above to pick a chunk.</span>
                <span className="hidden sm:inline">Select a chunk from the left panel to edit its notes and Greek studies.</span>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Prev / Next — fixed bottom bar, visible while scrolling long chunks */}
      {selectedChunk && studyLayout !== 'annotate' && (
        <div className="fixed bottom-0 inset-x-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={goToPreviousChunk}
              disabled={selectedChunkGlobalIndex <= 0}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous Chunk
            </button>
            <span className="text-xs text-slate-400">
              {selectedChunkGlobalIndex + 1} / {allChunks.length}
            </span>
            <button
              type="button"
              onClick={goToNextChunk}
              disabled={selectedChunkGlobalIndex >= allChunks.length - 1}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next Chunk →
            </button>
          </div>
        </div>
      )}

      {/* Greek word picker modal */}
      {suggestModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setSuggestModal(null); setSuggestSelection(new Set()); } }}
        >
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Select {suggestModal.language === 'hebrew' ? 'Hebrew' : 'Greek'} words to add</h2>
                <p className="text-xs text-slate-500 mt-0.5">{suggestModal.helperText || "Content words are pre-checked. Uncheck any you don't need."}</p>
              </div>
              <button
                onClick={() => { setSuggestModal(null); setSuggestSelection(new Set()); }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >×</button>
            </div>
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-2">
              <button
                onClick={() => setSuggestSelection(new Set(suggestModal.words.map((w) => w.strongKey)))}
                className="text-xs text-sky-600 hover:underline"
              >Select all</button>
              <span className="text-slate-300">·</span>
              <button
                onClick={() => setSuggestSelection(new Set())}
                className="text-xs text-sky-600 hover:underline"
              >Select none</button>
              <span className="ml-auto text-xs text-slate-400">{suggestSelection.size} selected</span>
            </div>
            <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 px-4 py-2">
              {suggestModal.words.map((w) => (
                <li key={w.strongKey}>
                  <label className="flex cursor-pointer items-center gap-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={suggestSelection.has(w.strongKey)}
                      onChange={(e) => {
                        setSuggestSelection((prev) => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(w.strongKey) : next.delete(w.strongKey);
                          return next;
                        });
                      }}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-900"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-slate-900">{w.def || w.strongKey}</span>
                        <span className="text-sm text-slate-500">{w.lexeme}</span>
                        {w.translit && <span className="text-xs text-slate-400 italic">{w.translit}</span>}
                        <span className="text-xs font-mono text-slate-300">{w.strongKey}</span>
                      </div>
                      {w.entry && (w.entry.strongs_def || w.entry.kjv_def || w.entry.derivation) && (
                        <details className="mt-1">
                          <summary
                            className="cursor-pointer text-xs font-medium text-sky-600 hover:text-sky-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Definition
                          </summary>
                          <div
                            className="mt-1 text-xs leading-5 text-slate-600"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(buildGreekDefinitionHtml(w.strongKey, w.entry)) }}
                          />
                        </details>
                      )}
                    </div>
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => { setSuggestModal(null); setSuggestSelection(new Set()); }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >Cancel</button>
              <button
                onClick={confirmSuggestWords}
                disabled={suggestSelection.size === 0}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >Add {suggestSelection.size > 0 ? `${suggestSelection.size} word${suggestSelection.size > 1 ? 's' : ''}` : 'words'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
