import { useState, useEffect, useRef } from 'react';
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
    readerTextHighlights,
    addTextHighlight,
    removeTextHighlight,
  } = useApp();

  const readerBook = bookOptions.find((b) => b.abbrev === readerBookAbbrev);
  const [readerDrawMode, setReaderDrawMode] = useState(false);
  const [readerWideLayout, setReaderWideLayout] = useState(() => localStorage.getItem('reader-wide') === '1');
  const readerPageInkStrokes = readerInkByPage?.[`${readerBookAbbrev}_${readerChapter}`] ?? [];
  const [selectionPicker, setSelectionPicker] = useState(null);
  const swipeTouchRef = useRef(null);

  const [toolbarVisible, setToolbarVisible] = useState(true);

  useEffect(() => {
    localStorage.setItem('reader-wide', readerWideLayout ? '1' : '0');
    // Auto-collapse toolbar when entering wide mode, restore when leaving
    setToolbarVisible(!readerWideLayout);
  }, [readerWideLayout]);

  // Swipe left/right to navigate chapters
  const handleTouchStart = (e) => {
    if (readerDrawMode) return;
    const t = e.changedTouches[0];
    swipeTouchRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (readerDrawMode || !swipeTouchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeTouchRef.current.x;
    const dy = t.clientY - swipeTouchRef.current.y;
    swipeTouchRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.8) return;
    if (dx < 0) readerGoToNextChapter();
    else readerGoToPreviousChapter();
  };

  // Arrow keys for desktop
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.key === 'ArrowLeft') readerGoToPreviousChapter();
      else if (e.key === 'ArrowRight') readerGoToNextChapter();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [readerGoToPreviousChapter, readerGoToNextChapter]);

  // Dismiss the highlight picker when tapping outside it
  useEffect(() => {
    if (!selectionPicker) return;
    const dismiss = () => setSelectionPicker(null);
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [selectionPicker]);

  // Render verse text with colored highlights and optional search match highlight
  function renderVerseText(verseNum, text, searchLow) {
    const spans = [];
    for (const h of (readerTextHighlights || [])) {
      if (h.book === readerBookAbbrev && h.chapter === readerChapter && h.verse === verseNum) {
        spans.push({ start: h.startOffset, end: h.endOffset, type: 'hl', id: h.id, color: h.color });
      }
    }
    if (searchLow) {
      const lower = text.toLowerCase();
      let i = 0;
      while ((i = lower.indexOf(searchLow, i)) !== -1) {
        spans.push({ start: i, end: i + searchLow.length, type: 'search' });
        i += searchLow.length;
      }
    }
    if (!spans.length) return text;
    spans.sort((a, b) => a.start - b.start);
    const parts = [];
    let cursor = 0;
    for (const s of spans) {
      if (s.start < cursor) continue;
      if (s.start > cursor) parts.push(text.slice(cursor, s.start));
      if (s.type === 'hl') {
        parts.push(
          <mark key={s.id} style={{ backgroundColor: s.color, borderRadius: '2px', cursor: 'pointer' }}
                onClick={() => removeTextHighlight(s.id)} title="Click to remove highlight">
            {text.slice(s.start, s.end)}
          </mark>
        );
      } else {
        parts.push(
          <mark key={`srch${s.start}`} className="bg-yellow-200 rounded px-0.5">
            {text.slice(s.start, s.end)}
          </mark>
        );
      }
      cursor = s.end;
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
  }

  // Detect text selection and show the highlight color picker
  function handleSelectionEnd() {
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width) return;
      let node = range.commonAncestorContainer;
      if (node.nodeType !== 1) node = node.parentNode;
      while (node && !(node.dataset && node.dataset.verseNum)) node = node.parentElement;
      if (!node) return;
      const verseNum = Number(node.dataset.verseNum);
      const verse = readerVerses.find(v => v.number === verseNum);
      if (!verse) return;
      const selectedText = sel.toString();
      const startOffset = verse.text.indexOf(selectedText);
      if (startOffset === -1) return;
      setSelectionPicker({
        x: (rect.left + rect.right) / 2,
        y: rect.top,
        verse: verseNum,
        startOffset,
        endOffset: startOffset + selectedText.length,
      });
    }, 20);
  }

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
      <main
        className={`mx-auto px-4 py-8 sm:px-6 lg:px-8 ${readerDrawMode ? 'max-w-full' : readerWideLayout ? 'max-w-7xl' : 'max-w-3xl'}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Collapsible toolbar — hidden in wide focus mode */}
        <div className={`transition-all duration-200 ${!toolbarVisible ? 'hidden' : ''}`}>

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
          <button
            type="button"
            onClick={() => setReaderWideLayout((v) => !v)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${readerWideLayout ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          >
            ⊞ Wide
          </button>
          {readerWideLayout && (
            <button
              type="button"
              onClick={() => setToolbarVisible(false)}
              className="rounded-lg px-3 py-1 text-xs font-semibold border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
            >
              ✕ Hide
            </button>
          )}
        </div>

        </div>{/* end collapsible toolbar */}

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
              <div className={`leading-relaxed text-slate-800 ${readerWideLayout ? 'md:columns-2 md:gap-x-10 space-y-0' : 'space-y-3'}`}
                   style={{ fontSize: `${readerFontSize}em` }}
                   onPointerUp={handleSelectionEnd}>
                {filtered.map((verse) => {
                  const chapterInterlinear = readerInterlinear?.[String(readerChapter)];
                  const verseWords = chapterInterlinear?.[String(verse.number)];
                  const isOpen = readerSelectedVerse === verse.number;
                  const verseKey = `${readerBookAbbrev}-${readerChapter}-${verse.number}`;
                  const bmColor = readerBookmarks[verseKey];
                  const crossRefs = readerCrossRefs?.[verse.number];

                  return (
                    <div key={verse.number} id={`reader-verse-${verse.number}`} data-verse-num={verse.number}
                      className="group break-inside-avoid rounded-xl transition mb-3"
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
                        <p className="flex-1">{renderVerseText(verse.number, verse.text, searchLower)}</p>
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
            <div className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 font-serif text-sm leading-relaxed text-slate-800 sm:w-72 sm:shrink-0 sm:sticky sm:top-6 sm:max-h-[80vh] sm:overflow-y-auto"
                 onPointerUp={handleSelectionEnd}>
              <div className="mb-3">
                <span className="font-semibold text-slate-900">{readerBook?.name} {readerChapter}</span>
                <span className="ml-2 text-xs text-slate-400">BSB</span>
                <p className="mt-1 text-xs text-slate-400 font-sans">Select text to highlight</p>
              </div>
              {!readerLoading && readerVerses.map((v) => (
                <p key={v.number} className="mb-2" data-verse-num={v.number}>
                  <span className="font-semibold text-slate-700">{v.number}.</span>{' '}
                  {renderVerseText(v.number, v.text, '')}
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

      {/* Wide focus mode — fixed top bar to restore toolbar */}
      {readerWideLayout && !toolbarVisible && (
        <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200/60 bg-white/80 px-4 py-2 backdrop-blur-sm">
          <span className="text-sm font-semibold text-slate-700">
            {readerBook?.name} {readerChapter}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={readerGoToPreviousChapter} disabled={readerChapter <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              ‹ Prev
            </button>
            <button type="button" onClick={readerGoToNextChapter} disabled={readerChapter >= readerTotalChapters}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
              Next ›
            </button>
            <button type="button" onClick={() => setToolbarVisible(true)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              ⚙ Tools
            </button>
          </div>
        </div>
      )}

      {/* Side chapter nav — fixed left/right arrows */}
      {!readerDrawMode && (
        <>
          <button
            type="button"
            onClick={readerGoToPreviousChapter}
            disabled={readerChapter <= 1}
            aria-label="Previous chapter"
            className="fixed left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-slate-900 disabled:opacity-0 disabled:pointer-events-none"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={readerGoToNextChapter}
            disabled={readerChapter >= readerTotalChapters}
            aria-label="Next chapter"
            className="fixed right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-slate-900 disabled:opacity-0 disabled:pointer-events-none"
          >
            ›
          </button>
        </>
      )}

      {/* Highlight color picker — appears above text selection */}
      {selectionPicker && (
        <div
          className="fixed z-50 flex items-center gap-1.5 rounded-2xl bg-white px-2.5 py-2 shadow-2xl border border-slate-200"
          style={{
            left: Math.max(8, Math.min(selectionPicker.x - 105, window.innerWidth - 220)),
            top: selectionPicker.y > 80 ? selectionPicker.y - 56 : selectionPicker.y + 28,
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa'].map(color => (
            <button
              key={color}
              className="h-7 w-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform active:scale-95"
              style={{ backgroundColor: color }}
              onPointerDown={(e) => {
                e.preventDefault();
                addTextHighlight({
                  book: readerBookAbbrev,
                  chapter: readerChapter,
                  verse: selectionPicker.verse,
                  startOffset: selectionPicker.startOffset,
                  endOffset: selectionPicker.endOffset,
                  color,
                });
                window.getSelection()?.removeAllRanges();
                setSelectionPicker(null);
              }}
            />
          ))}
          <button
            className="ml-1 h-7 w-7 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center hover:bg-slate-200 transition"
            onPointerDown={(e) => {
              e.preventDefault();
              window.getSelection()?.removeAllRanges();
              setSelectionPicker(null);
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
