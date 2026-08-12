import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.js';
import { bookOptions, BookmarkIcon, CopyIcon } from '../App.jsx';
import DrawCanvas from './DrawCanvas.jsx';

export default function ReaderPage() {
  const {
    authStatus,
    goHome,
    readerBookAbbrev,
    readerChapter, setReaderChapter,
    readerVerses,
    readerTotalChapters,
    readerLoading,
    readerError,
    readerInterlinear,
    readerSelectedVerse, setReaderSelectedVerse,
    readerFontSize, setReaderFontSize,
    readerBookmarks,
    readerBookmarksPanelOpen, setReaderBookmarksPanelOpen,
    readerCrossRefs,
    readerCrossRefsLoading,
    readerShowCrossRefs, setReaderShowCrossRefs,
    readerSearch, setReaderSearch,
    readerSearchActive, setReaderSearchActive,
    readerSearchScope, setReaderSearchScope,
    readerAudioState,
    bibleIndexStatus,
    audioNarrator, setAudioNarrator,
    _bibleIndexCacheRef,
    handleReaderBookChange,
    readerGoToPreviousChapter,
    readerGoToNextChapter,
    jumpToReaderVerse,
    toggleReaderBookmark,
    cycleBookmarkColor,
    loadReaderCrossRefs,
    loadBibleIndex,
    handlePlayReaderAudio,
    handleToggleReaderAudioPause,
    handleStopBookAudio,
    speakOriginalWord,
    copyVerse,
    formatCrossRef,
    setReaderCrossRefs,
    readerInkByPage,
    updateReaderPageInk,
  } = useApp();

  const readerBook = bookOptions.find((b) => b.abbrev === readerBookAbbrev);
  const [readerDrawMode, setReaderDrawMode] = useState(false);
  const readerPageInkStrokes = readerInkByPage?.[`${readerBookAbbrev}_${readerChapter}`] ?? [];

  const bookmarkEntries = Object.entries(readerBookmarks).map(([key, color]) => {
    const [bAbbrev, chapterStr, verseStr] = key.split('-');
    const bookIndex = bookOptions.findIndex((b) => b.abbrev === bAbbrev);
    return {
      key, color,
      bookAbbrev: bAbbrev,
      bookName: bookOptions[bookIndex]?.name ?? bAbbrev,
      chapter: Number(chapterStr),
      verse: Number(verseStr),
      bookIndex,
    };
  }).sort((a, b) => a.bookIndex - b.bookIndex || a.chapter - b.chapter || a.verse - b.verse);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">Read the Bible (BSB)</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goHome}
              className="rounded-xl border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              ← Back to Studies
            </button>
            {authStatus}
          </div>
        </div>
      </header>
      <main className={`mx-auto px-4 py-8 sm:px-6 lg:px-8 ${readerDrawMode ? 'max-w-full' : 'max-w-3xl'}`}>
        {/* Navigation + tools bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-panel">
          <label className="text-sm text-slate-600">
            Book{' '}
            <select
              value={readerBookAbbrev}
              onChange={(e) => handleReaderBookChange(e.target.value)}
              className="ml-1 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              {bookOptions.map((b) => (
                <option key={b.abbrev} value={b.abbrev}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Chapter{' '}
            <select
              value={readerChapter}
              onChange={(e) => { setReaderChapter(Number(e.target.value)); setReaderSelectedVerse(null); setReaderCrossRefs(null); setReaderSearch(''); setReaderSearchActive(false); }}
              className="ml-1 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            >
              {Array.from({ length: readerTotalChapters }, (_, i) => i + 1).map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={readerGoToPreviousChapter} disabled={readerChapter <= 1}
              className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              ‹ Prev
            </button>
            <button type="button" onClick={readerGoToNextChapter} disabled={readerChapter >= readerTotalChapters}
              className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
              Next ›
            </button>
          </div>
        </div>

        {/* Tool strip: font size · cross-refs · search */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-panel">
          <span className="text-xs text-slate-500 mr-1">Text size</span>
          {[['S', 0.875], ['M', 1], ['L', 1.125], ['XL', 1.25]].map(([label, size]) => (
            <button key={label} type="button"
              onClick={() => setReaderFontSize(size)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${readerFontSize === size ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
          <div className="mx-2 h-4 w-px bg-slate-200" />
          <button type="button"
            onClick={() => { setReaderShowCrossRefs((v) => !v); if (!readerShowCrossRefs) loadReaderCrossRefs(readerBookAbbrev, readerChapter); }}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${readerShowCrossRefs ? 'bg-amber-100 text-amber-800' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            {readerCrossRefsLoading ? 'Loading refs…' : '🔗 Cross-Refs'}
          </button>
          <div className="mx-2 h-4 w-px bg-slate-200" />
          <div className="relative">
            <button type="button"
              onClick={() => setReaderBookmarksPanelOpen((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${readerBookmarksPanelOpen ? 'bg-sky-100 text-sky-800' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <BookmarkIcon filled={bookmarkEntries.length > 0} />
              Bookmarks{bookmarkEntries.length > 0 ? ` (${bookmarkEntries.length})` : ''}
            </button>
            {readerBookmarksPanelOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
                {bookmarkEntries.length === 0 ? (
                  <p className="p-2 text-sm text-slate-500">
                    No bookmarks yet. Tap the bookmark icon next to any verse to save it here.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-1 overflow-y-auto">
                    {bookmarkEntries.map((entry) => (
                      <div key={entry.key} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-50">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <button type="button"
                          onClick={() => jumpToReaderVerse(entry.bookAbbrev, entry.chapter, entry.verse)}
                          className="flex-1 truncate text-left text-sm font-medium text-slate-700 hover:text-sky-700">
                          {entry.bookName} {entry.chapter}:{entry.verse}
                        </button>
                        <button type="button"
                          onClick={() => toggleReaderBookmark(entry.key)}
                          title="Remove bookmark"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="mx-2 h-4 w-px bg-slate-200" />
          {readerSearchActive ? (
            <div className="flex items-center gap-1">
              <div className="flex overflow-hidden rounded-lg border border-slate-300">
                <button type="button"
                  onClick={() => setReaderSearchScope('chapter')}
                  className={`px-2 py-1 text-xs font-semibold transition ${readerSearchScope === 'chapter' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  This chapter
                </button>
                <button type="button"
                  onClick={() => { setReaderSearchScope('bible'); if (bibleIndexStatus === 'idle') loadBibleIndex(); }}
                  className={`px-2 py-1 text-xs font-semibold transition ${readerSearchScope === 'bible' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  Whole Bible
                </button>
              </div>
              <input
                autoFocus
                type="text"
                value={readerSearch}
                onChange={(e) => setReaderSearch(e.target.value)}
                placeholder={readerSearchScope === 'bible' ? 'Search the whole Bible…' : 'Search this chapter…'}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button type="button" onClick={() => { setReaderSearch(''); setReaderSearchActive(false); }}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50">✕</button>
            </div>
          ) : (
            <button type="button" onClick={() => setReaderSearchActive(true)}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              🔍 Search
            </button>
          )}
          <div className="mx-2 h-4 w-px bg-slate-200" />
          <button
            type="button"
            onClick={() => setReaderDrawMode((v) => !v)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${readerDrawMode ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            ✏ Draw
          </button>
        </div>

        {/* Whole-Bible search results */}
        {readerSearchActive && readerSearchScope === 'bible' && (
          <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
            {bibleIndexStatus === 'loading' && (
              <p className="text-sm text-slate-500">Loading the full Bible for search — this happens once per visit (~7MB)…</p>
            )}
            {bibleIndexStatus === 'error' && (
              <p className="text-sm text-rose-600">Couldn't load the full Bible for search. <button type="button" onClick={loadBibleIndex} className="underline">Try again</button></p>
            )}
            {bibleIndexStatus === 'ready' && (() => {
              const q = readerSearch.trim().toLowerCase();
              if (!q) return <p className="text-sm text-slate-500">Type at least a word to search all 66 books.</p>;
              const index = _bibleIndexCacheRef.current.BSB ?? [];
              const matches = index.filter((v) => v.text.toLowerCase().includes(q));
              if (matches.length === 0) return <p className="text-sm text-slate-500">No verses match "{readerSearch}".</p>;
              const shown = matches.slice(0, 100);
              return (
                <div className="space-y-1">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {matches.length} match{matches.length === 1 ? '' : 'es'}{matches.length > shown.length ? ` (showing first ${shown.length})` : ''}
                  </p>
                  <div className="max-h-96 space-y-1 overflow-y-auto">
                    {shown.map((v) => {
                      const idx = v.text.toLowerCase().indexOf(q);
                      return (
                        <button key={`${v.bookAbbrev}-${v.chapter}-${v.verse}`} type="button"
                          onClick={() => jumpToReaderVerse(v.bookAbbrev, v.chapter, v.verse)}
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">
                          <span className="font-semibold text-slate-700">{v.bookName} {v.chapter}:{v.verse}</span>{' '}
                          <span className="text-slate-600">
                            {v.text.slice(0, idx)}
                            <mark className="rounded bg-yellow-200 px-0.5">{v.text.slice(idx, idx + q.length)}</mark>
                            {v.text.slice(idx + q.length)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Audio player */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-panel">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Listen to this chapter</h3>
            <p className="mt-1 text-xs text-slate-500">
              {readerAudioState.status === 'error'
                ? "Couldn't load audio for this chapter/narrator."
                : `Audio follows ${readerBook?.name} ${readerChapter} as you browse.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={audioNarrator} onChange={(e) => setAudioNarrator(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200">
              <option value="david">David</option>
              <option value="hays">Hays</option>
              <option value="souer">Souer</option>
            </select>
            {readerAudioState.status === 'playing' || readerAudioState.status === 'paused' ? (
              <>
                <button type="button" onClick={handleToggleReaderAudioPause}
                  className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-500">
                  {readerAudioState.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button type="button" onClick={handleStopBookAudio}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  Stop
                </button>
              </>
            ) : (
              <button type="button" onClick={handlePlayReaderAudio}
                className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-sky-500">
                Play
              </button>
            )}
          </div>
        </div>

        {/* Verses — hidden when draw mode is active */}
        <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-panel${readerDrawMode ? ' hidden' : ''}`}>
          <h2 className="mb-1 text-xl font-semibold text-slate-900">
            {readerBook?.name} {readerChapter} <span className="text-sm font-normal text-slate-500">(BSB)</span>
          </h2>
          {readerInterlinear && (
            <p className="mb-4 text-xs text-slate-400">Click a verse number to see original words &amp; pronunciation · bookmark icon to save · copy icon to copy</p>
          )}
          {!readerInterlinear && (
            <p className="mb-4 text-xs text-slate-400">Hover a verse for actions</p>
          )}
          {readerLoading && <p className="text-sm text-slate-500">Loading…</p>}
          {readerError && <p className="text-sm text-rose-600">{readerError}</p>}
          {!readerLoading && !readerError && (() => {
            const searchLower = readerSearchScope === 'chapter' ? readerSearch.trim().toLowerCase() : '';
            const filtered = searchLower
              ? readerVerses.filter((v) => v.text.toLowerCase().includes(searchLower))
              : readerVerses;
            if (searchLower && filtered.length === 0) {
              return <p className="text-sm text-slate-500">No verses match "{readerSearch}".</p>;
            }
            return (
              <div className="space-y-3 leading-relaxed text-slate-800" style={{ fontSize: `${readerFontSize}em` }}>
                {filtered.map((verse) => {
                  const chapterInterlinear = readerInterlinear?.[String(readerChapter)];
                  const verseWords = chapterInterlinear?.[String(verse.number)];
                  const isOpen = readerSelectedVerse === verse.number;
                  const verseKey = `${readerBookAbbrev}-${readerChapter}-${verse.number}`;
                  const bmColor = readerBookmarks[verseKey];
                  const crossRefs = readerCrossRefs?.[verse.number];

                  const highlightText = (text) => {
                    if (!searchLower) return text;
                    const idx = text.toLowerCase().indexOf(searchLower);
                    if (idx === -1) return text;
                    return (
                      <>
                        {text.slice(0, idx)}
                        <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + searchLower.length)}</mark>
                        {text.slice(idx + searchLower.length)}
                      </>
                    );
                  };

                  return (
                    <div key={verse.number} id={`reader-verse-${verse.number}`} className="group rounded-xl transition"
                      style={bmColor ? { backgroundColor: bmColor + '55', borderLeft: `3px solid ${bmColor}`, paddingLeft: '0.5rem' } : {}}>
                      <div className="flex items-start gap-1">
                        <button type="button"
                          onClick={() => setReaderSelectedVerse(isOpen ? null : verse.number)}
                          className={`mt-0.5 shrink-0 rounded px-1 text-xs font-bold transition ${
                            verseWords
                              ? isOpen ? 'bg-sky-600 text-white' : 'text-sky-600 hover:bg-sky-50'
                              : 'cursor-default text-slate-400'
                          }`}
                          title={verseWords ? 'Show original words' : undefined}>
                          {verse.number}
                        </button>
                        <p className="flex-1">{highlightText(verse.text)}</p>
                        <span className="ml-1 mt-0.5 flex shrink-0 items-center gap-1">
                          <button type="button"
                            onClick={() => toggleReaderBookmark(verseKey)}
                            className={`rounded p-1 leading-none hover:bg-slate-100 ${bmColor ? 'text-amber-600' : 'text-slate-400'}`}
                            title={bmColor ? 'Remove bookmark' : 'Bookmark this verse'}>
                            <BookmarkIcon filled={!!bmColor} />
                          </button>
                          {bmColor && (
                            <button type="button"
                              onClick={() => cycleBookmarkColor(verseKey)}
                              className="rounded p-1 text-sm leading-none hover:bg-slate-100"
                              title="Change highlight colour">
                              🎨
                            </button>
                          )}
                          <button type="button"
                            onClick={() => copyVerse(readerBook?.name, readerChapter, verse.number, verse.text)}
                            className="rounded p-1 leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Copy verse">
                            <CopyIcon />
                          </button>
                        </span>
                      </div>

                      {readerShowCrossRefs && crossRefs && (
                        <div className="mt-1 ml-6 flex flex-wrap gap-1">
                          {crossRefs.slice(0, 8).map((ref, i) => {
                            const label = formatCrossRef(ref);
                            return (
                              <span key={i} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 cursor-default" title={`Score: ${ref.score ?? '?'}`}>
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {isOpen && verseWords && (
                        <div className="mt-2 mb-1 ml-6 rounded-2xl border border-sky-100 bg-sky-50 p-3">
                          <div className="flex flex-wrap gap-2">
                            {verseWords.map((w, i) => {
                              const isHebrew = w.s?.startsWith('H');
                              const canSpeak = isHebrew || w.s?.startsWith('G');
                              return (
                                <div key={i} className="rounded-xl border border-sky-200 bg-white p-2 text-center shadow-sm"
                                  style={{ minWidth: '4.5rem', maxWidth: '9rem' }}>
                                  <div className={`text-lg font-medium leading-tight ${isHebrew ? 'font-serif' : ''}`} dir={isHebrew ? 'rtl' : 'ltr'}>
                                    {w.o}
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-500 italic">{w.t}</div>
                                  <div className="mt-1 text-xs font-semibold text-slate-800">{w.g}</div>
                                  {w.p && <div className="mt-0.5 text-[10px] text-slate-400 leading-tight">{w.p}</div>}
                                  {w.s && <div className="mt-0.5 text-[10px] text-slate-400">{w.s}</div>}
                                  {canSpeak && (
                                    <button type="button" onClick={() => speakOriginalWord(w.o, w.s)}
                                      className="mt-1.5 rounded-lg bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700 hover:bg-sky-200 transition"
                                      title={`Pronounce in ${isHebrew ? 'Hebrew' : 'Greek'}`}>
                                      🔊 Speak
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Draw mode — Bible text on left, notebook canvas on right */}
        {readerDrawMode && (
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            {/* Scripture panel — sticky so it stays in view while notebook scrolls */}
            <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 font-serif text-sm leading-relaxed text-slate-800 sm:w-72 sm:shrink-0 sm:sticky sm:top-6 sm:max-h-[80vh] sm:overflow-y-auto">
              <div className="mb-3">
                <span className="font-semibold text-slate-900">{readerBook?.name} {readerChapter}</span>
                <span className="ml-2 text-xs text-slate-400">BSB</span>
              </div>
              {!readerLoading && readerVerses.map((v) => (
                <p key={v.number} className="mb-2">
                  <span className="font-semibold text-slate-700">{v.number}.</span>{' '}
                  {v.text}
                </p>
              ))}
            </div>
            {/* Notebook canvas */}
            <div className="min-w-0 flex-1">
              <DrawCanvas
                strokes={readerPageInkStrokes}
                onStrokesChange={(s) => updateReaderPageInk(readerBookAbbrev, readerChapter, s)}
                onDone={() => setReaderDrawMode(false)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
