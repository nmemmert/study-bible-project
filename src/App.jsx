import { useEffect, useRef, useState } from 'react';
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

const bookOptions = [
  { name: 'Matthew', abbrev: 'MAT' },
  { name: 'Mark', abbrev: 'MRK' },
  { name: 'Luke', abbrev: 'LUK' },
  { name: 'John', abbrev: 'JHN' },
  { name: 'Acts', abbrev: 'ACT' },
  { name: 'Romans', abbrev: 'ROM' },
  { name: '1 Corinthians', abbrev: '1CO' },
  { name: '2 Corinthians', abbrev: '2CO' },
  { name: 'Galatians', abbrev: 'GAL' },
  { name: 'Ephesians', abbrev: 'EPH' },
  { name: 'Philippians', abbrev: 'PHP' },
  { name: 'Colossians', abbrev: 'COL' },
  { name: '1 Thessalonians', abbrev: '1TH' },
  { name: '2 Thessalonians', abbrev: '2TH' },
  { name: '1 Timothy', abbrev: '1TI' },
  { name: '2 Timothy', abbrev: '2TI' },
  { name: 'Titus', abbrev: 'TIT' },
  { name: 'Philemon', abbrev: 'PHM' },
  { name: 'Hebrews', abbrev: 'HEB' },
  { name: 'James', abbrev: 'JAS' },
  { name: '1 Peter', abbrev: '1PE' },
  { name: '2 Peter', abbrev: '2PE' },
  { name: '1 John', abbrev: '1JN' },
  { name: '2 John', abbrev: '2JN' },
  { name: '3 John', abbrev: '3JN' },
  { name: 'Jude', abbrev: 'JUD' },
  { name: 'Revelation', abbrev: 'REV' },
];

// ---------------------------------------------------------------------------
// Stable utility exports (used by tests and other modules)
// ---------------------------------------------------------------------------

export const storageKey = (translation, book, chapter) => `bible-study-${translation}-${book}-${chapter}`;
export const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

// ---------------------------------------------------------------------------
// Migration helpers (exported for testing)
// ---------------------------------------------------------------------------

export function migrateChunk(chunk) {
  if (chunk.observation !== undefined) return chunk; // already new format
  return {
    ...chunk,
    observation: chunk.notes ?? '',
    interpretation: '',
    application: '',
    crossReferences: [],
    notes: undefined,
  };
}

export function migrateProject(raw) {
  if (!raw) return null;
  // Already new format
  if (Array.isArray(raw.chapters)) {
    return {
      ...raw,
      chapters: raw.chapters.map((ch) => ({
        ...ch,
        chunks: ch.chunks.map(migrateChunk),
      })),
    };
  }
  // Old flat format → wrap in chapters array
  const id = raw.id ?? makeId();
  return {
    id,
    title: raw.title ?? '',
    translation: raw.translation ?? 'BSB',
    lastEdited: raw.lastEdited ?? Date.now(),
    selectedChunkId: raw.selectedChunkId ?? null,
    chapters: [
      {
        book: raw.book ?? '',
        bookAbbrev: raw.bookAbbrev ?? '',
        chapter: raw.chapter ?? '1',
        verses: raw.verses ?? [],
        chunks: (raw.chunks ?? []).map(migrateChunk),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const INDEX_KEY = 'bible-study-index';
const projectKey = (id) => `bible-study-project-${id}`;

function loadProjectIndex() {
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveProjectToStorage(project) {
  const updated = { ...project, lastEdited: Date.now() };
  window.localStorage.setItem(projectKey(updated.id), JSON.stringify(updated));
  const index = loadProjectIndex();
  const existing = index.findIndex((e) => e.id === updated.id);
  const summary = {
    id: updated.id,
    title: updated.title,
    lastEdited: updated.lastEdited,
    chapterSummary: buildChapterSummary(updated),
  };
  if (existing >= 0) {
    index[existing] = summary;
  } else {
    index.push(summary);
  }
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function deleteProjectFromStorage(id) {
  window.localStorage.removeItem(projectKey(id));
  const index = loadProjectIndex().filter((e) => e.id !== id);
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

function loadProjectById(id) {
  try {
    const raw = window.localStorage.getItem(projectKey(id));
    return raw ? migrateProject(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function migrateOldStorageKeys() {
  const keys = Object.keys(window.localStorage);
  keys.forEach((key) => {
    if (!key.startsWith('bible-study-') || key === INDEX_KEY || key.startsWith('bible-study-project-')) return;
    try {
      const raw = JSON.parse(window.localStorage.getItem(key));
      if (!raw || !raw.book) return;
      const migrated = migrateProject(raw);
      if (!migrated) return;
      saveProjectToStorage(migrated);
      window.localStorage.removeItem(key);
    } catch {
      // skip corrupt entries
    }
  });
}

function buildChapterSummary(project) {
  if (!Array.isArray(project.chapters)) return '';
  return project.chapters
    .map((ch) => `${ch.book} ${ch.chapter}`)
    .join(', ');
}

function formatRelativeDate(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Export / prompt builders (exported for testing)
// ---------------------------------------------------------------------------

export function buildExportHtml(project) {
  const style = `
    body { font-family: Georgia, serif; color: #0f172a; margin: 0; padding: 32px; }
    .page { max-width: 900px; margin: auto; }
    h1, h2 { font-family: Georgia, serif; }
    h1 { margin-bottom: 0.5rem; }
    .chapter-heading { margin: 2rem 0 0.5rem; font-size: 1.2rem; font-weight: 700; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.25rem; }
    .chunk { margin-bottom: 2rem; padding: 1.25rem 1.5rem; border: 1px solid #cbd5e1; border-radius: 0.75rem; background: #ffffff; }
    .verse { margin: 0 0 0.75rem; line-height: 1.7; }
    .scripture-ref { font-weight: 700; margin-bottom: 0.75rem; }
    .oia, .cross-refs, .greek { margin-top: 1rem; }
    .oia-section { margin-bottom: 0.75rem; }
    .greek table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    .greek th, .greek td { border: 1px solid #d1d5db; padding: 0.65rem; text-align: left; }
    .greek th { background: #f8fafc; }
    .definition { margin-top: 0.75rem; font-size: 0.95rem; line-height: 1.6; }
    .definition-block { margin-top: 1rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #f8fafc; }
  `;

  const chapters = Array.isArray(project.chapters) ? project.chapters : [];

  const chunksHtml = chapters.map((ch) => {
    const chapterHeader = `<h2 class="chapter-heading">${ch.book} ${ch.chapter}</h2>`;
    const chunkSections = ch.chunks.map((chunk) => {
      const scripture = chunk.startVerse === chunk.endVerse
        ? `${ch.book} ${ch.chapter}:${chunk.startVerse}`
        : `${ch.book} ${ch.chapter}:${chunk.startVerse}-${chunk.endVerse}`;
      const versesText = ch.verses
        .filter((verse) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse)
        .map((verse) => `<p class="verse"><strong>${verse.number}</strong> ${verse.text}</p>`)
        .join('');

      const observation = (chunk.observation ?? '').trim().replace(/\n/g, '<br />') || '<em>No observation.</em>';
      const interpretation = (chunk.interpretation ?? '').trim().replace(/\n/g, '<br />') || '<em>No interpretation.</em>';
      const application = (chunk.application ?? '').trim().replace(/\n/g, '<br />') || '<em>No application.</em>';

      const crossRefsHtml = (chunk.crossReferences ?? []).length > 0
        ? `<div class="cross-refs"><strong>CROSS-REFERENCES:</strong> ${chunk.crossReferences.join(', ')}</div>`
        : '';

      const greekRows = chunk.greekWords.map((word) => `
        <tr>
          <td><strong>${word.strongNumber}</strong></td>
          <td>${word.lexeme || ''}</td>
          <td>${word.transliteration || ''}</td>
          <td>${word.partOfSpeech || ''}</td>
          <td>${word.shortDefinition || ''}</td>
        </tr>
      `).join('');
      const greekTable = wordTableHtml(greekRows);
      const extendedDefinitions = chunk.greekWords
        .filter((word) => word.definitionHtml)
        .map((word) => `
          <div class="definition-block">
            <p><strong>${word.strongNumber} — ${word.lexeme || ''}</strong></p>
            <div class="definition">${word.definitionHtml}</div>
          </div>
        `)
        .join('');

      return `
        <section class="chunk">
          <div class="scripture-ref">${scripture}</div>
          ${versesText}
          <div class="oia">
            <div class="oia-section"><strong>OBSERVATION:</strong><p>${observation}</p></div>
            <div class="oia-section"><strong>INTERPRETATION:</strong><p>${interpretation}</p></div>
            <div class="oia-section"><strong>APPLICATION:</strong><p>${application}</p></div>
          </div>
          ${crossRefsHtml}
          <div class="greek"><strong>GREEK WORDS:</strong>
            ${greekRows ? greekTable : '<p><em>No Greek word notes.</em></p>'}
            ${extendedDefinitions}
          </div>
        </section>
      `;
    }).join('');
    return chapterHeader + chunkSections;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${project.title}</title>
  <style>${style}</style>
</head>
<body>
  <div class="page">
    <h1>${project.title}</h1>
    <p>${project.translation}</p>
    ${chunksHtml}
  </div>
</body>
</html>`;
}

export function wordTableHtml(rows) {
  return `
    <table>
      <thead>
        <tr>
          <th>Strong's</th>
          <th>Greek</th>
          <th>Transliteration</th>
          <th>Part of Speech</th>
          <th>Short Definition</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function extractPartOfSpeech(definitionHtml) {
  const match = /Part\(s\) of speech:\s*([^<]+)/i.exec(definitionHtml || '');
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
}

export function htmlToPlainText(html = '') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const lines = [];
  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      lines.push(node.textContent || '');
      return;
    }
    if (node.nodeName === 'BR' || node.nodeName === 'P') {
      lines.push(node.textContent || '');
      lines.push('\n');
      return;
    }
    lines.push(node.textContent || '');
  });
  return lines.join('').replace(/\n{2,}/g, '\n').trim();
}

export function createParagraphsFromText(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Paragraph({ children: [new TextRun({ text: line })] }));
}

export function renderVerseContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map(renderVerseContent).join('');
  }
  if (content && typeof content === 'object') {
    if (content.lineBreak) {
      return '\n';
    }
    if (content.type === 'line_break') {
      return '\n';
    }
    if (Array.isArray(content.content)) {
      return renderVerseContent(content.content);
    }
    return '';
  }
  return '';
}

export function buildClaudePrompt(project) {
  const chapters = Array.isArray(project.chapters) ? project.chapters : [];
  const chapterLabel = chapters.map((ch) => `${ch.book} ${ch.chapter}`).join(', ');

  const header = `I've prepared a Bible study on ${chapterLabel} (${project.translation}) and need your help turning my notes into a polished study guide.

Below is my work organised by passage chunk, including my OIA notes and Greek word research. Please create a clear, structured study guide that:
- Synthesises my notes into coherent teaching points
- Naturally integrates the Greek word insights
- Includes 2–3 reflection questions per chunk
- Preserves the passage-by-passage structure

---

PROJECT: ${project.title}
TRANSLATION: ${project.translation}
PASSAGE: ${chapterLabel}

`;

  let chunkIndex = 0;
  const chunks = chapters.map((ch) => {
    return ch.chunks.map((chunk) => {
      chunkIndex += 1;
      const ref = chunk.startVerse === chunk.endVerse
        ? `${ch.book} ${ch.chapter}:${chunk.startVerse}`
        : `${ch.book} ${ch.chapter}:${chunk.startVerse}–${chunk.endVerse}`;

      const verses = ch.verses
        .filter((v) => v.number >= chunk.startVerse && v.number <= chunk.endVerse)
        .map((v) => `${v.number} ${v.text}`)
        .join('\n');

      const observation = (chunk.observation ?? '').trim() || 'No observation.';
      const interpretation = (chunk.interpretation ?? '').trim() || 'No interpretation.';
      const application = (chunk.application ?? '').trim() || 'No application.';

      const crossRefs = (chunk.crossReferences ?? []).length > 0
        ? chunk.crossReferences.join(', ')
        : 'None.';

      const greekWords = chunk.greekWords.length === 0
        ? 'None.'
        : chunk.greekWords.map((word) => {
            const summary = [
              word.strongNumber,
              word.lexeme,
              word.transliteration && `(${word.transliteration})`,
              word.partOfSpeech,
              word.shortDefinition,
            ].filter(Boolean).join(' | ');
            const definition = word.definitionHtml
              ? `\n  ${htmlToPlainText(word.definitionHtml)}`
              : '';
            return `• ${summary}${definition}`;
          }).join('\n');

      return `===

CHUNK ${chunkIndex} — ${ref}

Scripture:
${verses}

Observation:
${observation}

Interpretation:
${interpretation}

Application:
${application}

Cross-References: ${crossRefs}

Greek Words:
${greekWords}
`;
    }).join('\n');
  }).join('\n');

  return header + chunks;
}

export function parseBibleChapter(data) {
  if (data?.verses && Array.isArray(data.verses)) {
    return data.verses.map((verse) => ({
      number: verse.number,
      text: verse.text,
    }));
  }

  const chapterContents = data?.chapter?.content;
  if (!Array.isArray(chapterContents)) {
    return [];
  }

  return chapterContents
    .filter((item) => item?.type === 'verse')
    .map((item) => ({
      number: item.number,
      text: renderVerseContent(item.content).replace(/\s+/g, ' ').trim(),
    }));
}

// ---------------------------------------------------------------------------
// App component
// ---------------------------------------------------------------------------

const App = () => {
  const [availableTranslations, setAvailableTranslations] = useState(['BSB']);
  const [setup, setSetup] = useState({
    translation: 'BSB',
    book: 'Titus',
    bookAbbrev: 'TIT',
    chapter: '1',
    title: 'Titus 1 Study',
  });
  const [titleEdited, setTitleEdited] = useState(false);
  const [project, setProject] = useState(null);
  // 'home' | 'setup' | 'study'
  const [currentPage, setCurrentPage] = useState('home');
  const [projectIndex, setProjectIndex] = useState([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showAddChapterForm, setShowAddChapterForm] = useState(false);
  const [crossRefInput, setCrossRefInput] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const saveTimerRef = useRef(null);

  // ---------------------------------------------------------------------------
  // Startup: migrate old keys and load index
  // ---------------------------------------------------------------------------
  useEffect(() => {
    migrateOldStorageKeys();
    setProjectIndex(loadProjectIndex());
  }, []);

  useEffect(() => {
    fetch('https://bible.helloao.org/api/available_translations.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableTranslations(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!titleEdited) {
      setSetup((current) => ({
        ...current,
        title: `${current.book} ${current.chapter} Study`,
      }));
    }
  }, [setup.book, setup.chapter, titleEdited]);

  // Reset cross-ref input when selected chunk changes
  const allChunks = project ? project.chapters.flatMap((ch) => ch.chunks) : [];
  const activeChapter = project?.chapters[activeChapterIndex] ?? null;
  const selectedChunk = allChunks.find((c) => c.id === project?.selectedChunkId) ?? allChunks[0] ?? null;
  const selectedChunkChapter = selectedChunk
    ? project.chapters.find((ch) => ch.chunks.some((c) => c.id === selectedChunk.id))
    : null;
  const selectedChunkGlobalIndex = allChunks.findIndex((c) => c.id === project?.selectedChunkId);

  useEffect(() => {
    setCrossRefInput('');
  }, [project?.selectedChunkId]);

  // Autosave
  useEffect(() => {
    if (!project) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveProjectToStorage(project);
      setProjectIndex(loadProjectIndex());
      setSaveStatus('Saved');
      window.setTimeout(() => setSaveStatus(''), 1400);
    }, 1000);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [project]);

  // ---------------------------------------------------------------------------
  // Setup helpers
  // ---------------------------------------------------------------------------

  const handleSetupField = (field, value) => {
    if (field === 'book') {
      const selected = bookOptions.find((book) => book.abbrev === value) ?? bookOptions[0];
      setSetup((current) => ({
        ...current,
        book: selected.name,
        bookAbbrev: selected.abbrev,
      }));
    } else {
      setSetup((current) => ({ ...current, [field]: value }));
    }
  };

  const handleLoadChapter = async () => {
    if (!setup.bookAbbrev || !setup.chapter) {
      setErrorMessage('Please choose a book and chapter.');
      return;
    }
    setErrorMessage('');
    setLoadingChapter(true);
    try {
      const response = await fetch(
        `https://bible.helloao.org/api/${setup.translation}/${setup.bookAbbrev}/${setup.chapter}.json`,
      );
      if (!response.ok) throw new Error('Unable to load chapter.');
      const data = await response.json();
      const verses = parseBibleChapter(data);
      if (!data || !Array.isArray(verses) || verses.length === 0) {
        throw new Error('Invalid Bible data returned.');
      }

      if (project) {
        // Adding a chapter to an existing project
        const alreadyExists = project.chapters.some(
          (ch) => ch.bookAbbrev === setup.bookAbbrev && ch.chapter === setup.chapter,
        );
        if (alreadyExists) {
          setErrorMessage('That chapter is already in this project.');
          setLoadingChapter(false);
          return;
        }
        const newChapter = {
          book: setup.book,
          bookAbbrev: setup.bookAbbrev,
          chapter: setup.chapter,
          verses,
          chunks: [],
        };
        updateProject((current) => {
          const updatedChapters = [...current.chapters, newChapter];
          return { ...current, chapters: updatedChapters };
        });
        setActiveChapterIndex(project.chapters.length);
        setShowAddChapterForm(false);
        setErrorMessage('');
      } else {
        // Creating a brand-new project
        const newProject = {
          id: makeId(),
          title: setup.title,
          translation: setup.translation,
          lastEdited: Date.now(),
          selectedChunkId: null,
          chapters: [
            {
              book: setup.book,
              bookAbbrev: setup.bookAbbrev,
              chapter: setup.chapter,
              verses,
              chunks: [],
            },
          ],
        };
        setProject(newProject);
        setActiveChapterIndex(0);
        setCurrentPage('setup');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to load chapter.');
    } finally {
      setLoadingChapter(false);
    }
  };

  const updateProject = (updater) => {
    setProject((current) => (current ? updater(current) : current));
  };

  const beginStudying = () => {
    if (!project || allChunks.length === 0) return;
    updateProject((current) => ({
      ...current,
      selectedChunkId: current.selectedChunkId || allChunks[0]?.id || null,
    }));
    setCurrentPage('study');
  };

  // ---------------------------------------------------------------------------
  // Chunk navigation
  // ---------------------------------------------------------------------------

  const goToPreviousChunk = () => {
    if (selectedChunkGlobalIndex <= 0) return;
    updateProject((current) => ({
      ...current,
      selectedChunkId: allChunks[selectedChunkGlobalIndex - 1].id,
    }));
  };

  const goToNextChunk = () => {
    if (selectedChunkGlobalIndex < 0 || selectedChunkGlobalIndex >= allChunks.length - 1) return;
    updateProject((current) => ({
      ...current,
      selectedChunkId: allChunks[selectedChunkGlobalIndex + 1].id,
    }));
  };

  // ---------------------------------------------------------------------------
  // Chunk CRUD (operates on activeChapter in setup view, on selectedChunkChapter in study)
  // ---------------------------------------------------------------------------

  const addChunkToChapter = (chapterIndex, start, end) => {
    updateProject((current) => {
      const chapters = current.chapters.map((ch, idx) => {
        if (idx !== chapterIndex) return ch;
        const overlap = ch.chunks.find((c) => c.startVerse === start && c.endVerse === end);
        if (overlap) return ch;
        const newChunk = {
          id: makeId(),
          startVerse: start,
          endVerse: end,
          observation: '',
          interpretation: '',
          application: '',
          crossReferences: [],
          greekWords: [],
        };
        return { ...ch, chunks: [...ch.chunks, newChunk] };
      });
      // Find the newly added chunk id
      const newChunk = chapters[chapterIndex].chunks.at(-1);
      return { ...current, chapters, selectedChunkId: newChunk?.id ?? current.selectedChunkId };
    });
  };

  const addChunk = (start, end) => {
    if (!project) return;
    const chapter = activeChapter;
    if (!chapter) return;
    const overlap = chapter.chunks.find((c) => c.startVerse === start && c.endVerse === end);
    if (overlap) {
      setStatusMessage('That chunk already exists.');
      window.setTimeout(() => setStatusMessage(''), 1800);
      return;
    }
    addChunkToChapter(activeChapterIndex, start, end);
  };

  const handleVerseClick = (verseNumber, event) => {
    if (event.shiftKey && rangeStart !== null) {
      const start = Math.min(rangeStart, verseNumber);
      const end = Math.max(rangeStart, verseNumber);
      addChunk(start, end);
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }
    setRangeStart(verseNumber);
    setRangeEnd(verseNumber);
  };

  const updateChunk = (chunkId, patch) => {
    updateProject((current) => ({
      ...current,
      chapters: current.chapters.map((ch) => ({
        ...ch,
        chunks: ch.chunks.map((c) => (c.id === chunkId ? { ...c, ...patch } : c)),
      })),
    }));
  };

  const moveChunk = (chunkId, direction) => {
    updateProject((current) => ({
      ...current,
      chapters: current.chapters.map((ch) => {
        const index = ch.chunks.findIndex((c) => c.id === chunkId);
        if (index < 0) return ch;
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= ch.chunks.length) return ch;
        const updated = [...ch.chunks];
        const [removed] = updated.splice(index, 1);
        updated.splice(nextIndex, 0, removed);
        return { ...ch, chunks: updated };
      }),
    }));
  };

  const deleteChunk = (chunkId) => {
    updateProject((current) => {
      const newAllChunks = current.chapters
        .flatMap((ch) => ch.chunks)
        .filter((c) => c.id !== chunkId);
      const nextSelected =
        current.selectedChunkId === chunkId
          ? newAllChunks[0]?.id ?? null
          : current.selectedChunkId;
      return {
        ...current,
        selectedChunkId: nextSelected,
        chapters: current.chapters.map((ch) => ({
          ...ch,
          chunks: ch.chunks.filter((c) => c.id !== chunkId),
        })),
      };
    });
  };

  // ---------------------------------------------------------------------------
  // Cross-references
  // ---------------------------------------------------------------------------

  const addCrossRef = (chunkId) => {
    const ref = crossRefInput.trim();
    if (!ref) return;
    updateChunk(chunkId, {
      crossReferences: [...(selectedChunk?.crossReferences ?? []), ref],
    });
    setCrossRefInput('');
  };

  const removeCrossRef = (chunkId, ref) => {
    updateChunk(chunkId, {
      crossReferences: (selectedChunk?.crossReferences ?? []).filter((r) => r !== ref),
    });
  };

  // ---------------------------------------------------------------------------
  // Greek word helpers
  // ---------------------------------------------------------------------------

  const updateChunkWord = (chunkId, wordId, patch) => {
    updateProject((current) => ({
      ...current,
      chapters: current.chapters.map((ch) => ({
        ...ch,
        chunks: ch.chunks.map((chunk) => {
          if (chunk.id !== chunkId) return chunk;
          return {
            ...chunk,
            greekWords: chunk.greekWords.map((word) =>
              word.id === wordId ? { ...word, ...patch } : word,
            ),
          };
        }),
      })),
    }));
  };

  const addGreekWord = (chunkId) => {
    const newWord = {
      id: makeId(),
      query: '',
      strongNumber: '',
      lexeme: '',
      transliteration: '',
      partOfSpeech: '',
      shortDefinition: '',
      definitionHtml: '',
      loading: false,
    };
    updateProject((current) => ({
      ...current,
      chapters: current.chapters.map((ch) => ({
        ...ch,
        chunks: ch.chunks.map((chunk) =>
          chunk.id === chunkId
            ? { ...chunk, greekWords: [...chunk.greekWords, newWord] }
            : chunk,
        ),
      })),
    }));
  };

  const removeGreekWord = (chunkId, wordId) => {
    updateProject((current) => ({
      ...current,
      chapters: current.chapters.map((ch) => ({
        ...ch,
        chunks: ch.chunks.map((chunk) =>
          chunk.id === chunkId
            ? { ...chunk, greekWords: chunk.greekWords.filter((w) => w.id !== wordId) }
            : chunk,
        ),
      })),
    }));
  };

  const lookupGreekWord = async (chunkId, wordId) => {
    const chunk = allChunks.find((c) => c.id === chunkId);
    const word = chunk?.greekWords.find((w) => w.id === wordId);
    if (!word || !word.query.trim()) return;
    updateChunkWord(chunkId, wordId, { loading: true });
    try {
      const query = encodeURIComponent(word.query.trim());
      const response = await fetch(`https://bolls.life/dictionary-definition/BDBT/${query}/`);
      if (!response.ok) throw new Error('Lookup failed.');
      const definitions = await response.json();
      if (!Array.isArray(definitions) || definitions.length === 0) {
        updateChunkWord(chunkId, wordId, {
          strongNumber: '',
          shortDefinition: 'No definition found.',
          definitionHtml: '',
        });
        return;
      }
      const first = definitions[0];
      const extractedPartOfSpeech = extractPartOfSpeech(first.definition || '');
      updateChunkWord(chunkId, wordId, {
        strongNumber: first.topic || word.query,
        lexeme: first.lexeme || '',
        transliteration: first.transliteration || '',
        partOfSpeech: extractedPartOfSpeech || word.partOfSpeech || '',
        shortDefinition: first.short_definition || '',
        definitionHtml: first.definition || '',
      });
    } catch {
      updateChunkWord(chunkId, wordId, { shortDefinition: 'Lookup failed.' });
    } finally {
      updateChunkWord(chunkId, wordId, { loading: false });
    }
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  const exportChapter = () => {
    if (!project) return;
    const html = buildExportHtml(project);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, '-')}-study.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportChapterDocx = async () => {
    if (!project) return;
    const children = [
      new Paragraph({ text: project.title, heading: HeadingLevel.TITLE }),
      new Paragraph({
        text: `${project.translation} — ${buildChapterSummary(project)}`,
        spacing: { after: 300 },
      }),
    ];

    project.chapters.forEach((ch) => {
      children.push(new Paragraph({ text: `${ch.book} ${ch.chapter}`, heading: HeadingLevel.HEADING_1 }));
      ch.chunks.forEach((chunk) => {
        const scriptureHeading = chunk.startVerse === chunk.endVerse
          ? `${ch.book} ${ch.chapter}:${chunk.startVerse}`
          : `${ch.book} ${ch.chapter}:${chunk.startVerse}-${chunk.endVerse}`;

        children.push(new Paragraph({ text: scriptureHeading, heading: HeadingLevel.HEADING_2 }));
        ch.verses
          .filter((verse) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse)
          .forEach((verse) => {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${verse.number}. `, bold: true }),
                new TextRun({ text: verse.text }),
              ],
            }));
          });

        children.push(new Paragraph({ text: 'OBSERVATION:', spacing: { before: 240, after: 120 }, bold: true }));
        children.push(...createParagraphsFromText(chunk.observation || 'No observation.'));
        children.push(new Paragraph({ text: 'INTERPRETATION:', spacing: { before: 240, after: 120 }, bold: true }));
        children.push(...createParagraphsFromText(chunk.interpretation || 'No interpretation.'));
        children.push(new Paragraph({ text: 'APPLICATION:', spacing: { before: 240, after: 120 }, bold: true }));
        children.push(...createParagraphsFromText(chunk.application || 'No application.'));

        if ((chunk.crossReferences ?? []).length > 0) {
          children.push(new Paragraph({ text: 'CROSS-REFERENCES:', spacing: { before: 240, after: 120 }, bold: true }));
          children.push(new Paragraph({ text: chunk.crossReferences.join(', ') }));
        }

        children.push(new Paragraph({ text: 'GREEK WORDS:', spacing: { before: 240, after: 120 }, bold: true }));
        if (chunk.greekWords.length > 0) {
          const tableRows = [
            new TableRow({
              tableHeader: true,
              children: ['Strong', 'Greek', 'Transliteration', 'Part of Speech', 'Short Definition'].map((label) =>
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  children: [new Paragraph({ text: label, bold: true })],
                }),
              ),
            }),
            ...chunk.greekWords.map((word) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(word.strongNumber || '')] }),
                new TableCell({ children: [new Paragraph(word.lexeme || '')] }),
                new TableCell({ children: [new Paragraph(word.transliteration || '')] }),
                new TableCell({ children: [new Paragraph(word.partOfSpeech || '')] }),
                new TableCell({ children: [new Paragraph(word.shortDefinition || '')] }),
              ],
            })),
          ];
          children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          chunk.greekWords.forEach((word) => {
            if (word.definitionHtml) {
              children.push(new Paragraph({ text: `${word.strongNumber} — ${word.lexeme || ''}`, spacing: { before: 180, after: 120 }, bold: true }));
              children.push(...createParagraphsFromText(htmlToPlainText(word.definitionHtml)));
            }
          });
        } else {
          children.push(new Paragraph('No Greek word notes.'));
        }
        children.push(new Paragraph({ text: '', spacing: { after: 300 } }));
      });
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, '-')}-study.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyForClaude = () => {
    if (!project) return;
    const prompt = buildClaudePrompt(project);
    navigator.clipboard.writeText(prompt).then(() => {
      setSaveStatus('Copied for Claude!');
      window.setTimeout(() => setSaveStatus(''), 2000);
    });
  };

  // ---------------------------------------------------------------------------
  // Home page helpers
  // ---------------------------------------------------------------------------

  const openNewProject = () => {
    setProject(null);
    setActiveChapterIndex(0);
    setShowAddChapterForm(false);
    setRangeStart(null);
    setRangeEnd(null);
    setErrorMessage('');
    setStatusMessage('');
    setTitleEdited(false);
    setCurrentPage('setup');
  };

  const resumeProject = (id) => {
    const loaded = loadProjectById(id);
    if (!loaded) return;
    setProject(loaded);
    setActiveChapterIndex(0);
    setCurrentPage('setup');
  };

  const deleteProject = (id) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    deleteProjectFromStorage(id);
    setProjectIndex(loadProjectIndex());
  };

  const goHome = () => {
    setProjectIndex(loadProjectIndex());
    setCurrentPage('home');
    setProject(null);
    setRangeStart(null);
    setRangeEnd(null);
    setErrorMessage('');
    setStatusMessage('');
  };

  const verseLabel = (start, end) => (start === end ? `${start}` : `${start}-${end}`);

  // ---------------------------------------------------------------------------
  // Shared header
  // ---------------------------------------------------------------------------
  const headerButtons = (
    <div className="flex items-center gap-3">
      {currentPage !== 'home' && (
        <button
          type="button"
          onClick={goHome}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
        >
          ← Home
        </button>
      )}
      {project && currentPage === 'study' && (
        <button
          type="button"
          onClick={() => setCurrentPage('setup')}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
        >
          ← Back to Chunks
        </button>
      )}
      {project && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={copyForClaude}
            disabled={allChunks.length === 0}
            className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            Prepare for Claude
          </button>
          <button
            type="button"
            onClick={exportChapter}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400"
          >
            Export HTML
          </button>
          <button
            type="button"
            onClick={exportChapterDocx}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-400"
          >
            Export DOCX
          </button>
        </div>
      )}
      <div className="text-right text-sm text-slate-300">
        {loadingChapter ? (
          <span>Loading…</span>
        ) : saveStatus ? (
          <span className="text-emerald-300">{saveStatus}</span>
        ) : (
          <span>&nbsp;</span>
        )}
      </div>
    </div>
  );

  // ---------------------------------------------------------------------------
  // HOME PAGE
  // ---------------------------------------------------------------------------
  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
              <h1 className="mt-2 text-2xl font-semibold">My Studies</h1>
            </div>
            <button
              type="button"
              onClick={openNewProject}
              className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600"
            >
              + New Project
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projectIndex
                .slice()
                .sort((a, b) => (b.lastEdited ?? 0) - (a.lastEdited ?? 0))
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel"
                  >
                    <div className="flex-1">
                      <h2 className="text-base font-semibold text-slate-900">{entry.title}</h2>
                      {entry.chapterSummary && (
                        <p className="mt-1 text-sm text-slate-500">{entry.chapterSummary}</p>
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
          )}
        </main>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SETUP PAGE (chunk builder)
  // ---------------------------------------------------------------------------
  if (currentPage === 'setup') {
    const chapterTabs = project?.chapters ?? [];

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
              <h1 className="mt-2 text-2xl font-semibold">
                {project ? project.title : 'New Study'}
              </h1>
            </div>
            {headerButtons}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
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
                      {statusMessage || 'Shift-click a second verse to create a chunk.'}
                    </div>
                  </div>
                  <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-600">Chapter verses</span>
                        <span className="text-xs text-slate-500">Click a verse, then shift-click an end verse.</span>
                      </div>
                      <div data-testid="verse-list" className="max-h-[520px] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 scrollbar-thin">
                        {activeChapter.verses.map((verse) => {
                          const inRange =
                            rangeStart !== null &&
                            verse.number >= Math.min(rangeStart, rangeEnd) &&
                            verse.number <= Math.max(rangeStart, rangeEnd);
                          const inChunk = activeChapter.chunks.some(
                            (chunk) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse,
                          );
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
                    <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-900">Chunks</h3>
                        <span className="text-xs text-slate-500">{activeChapter.chunks.length} created</span>
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
                                  {activeChapter.book} {activeChapter.chapter}:{verseLabel(chunk.startVerse, chunk.endVerse)}
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

  // ---------------------------------------------------------------------------
  // STUDY PAGE
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">{project?.title ?? ''}</h1>
          </div>
          {headerButtons}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-8 xl:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
            <div className="mb-4">
              <p className="text-sm font-medium text-slate-500">Chunk Navigation</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{allChunks.length} chunks</h2>
            </div>
            <div className="space-y-6 max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin">
              {project?.chapters.map((ch) => (
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
                                {ch.book} {ch.chapter}:{verseLabel(chunk.startVerse, chunk.endVerse)}
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
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Chunk editor</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedChunk
                    ? `Section ${verseLabel(selectedChunk.startVerse, selectedChunk.endVerse)}`
                    : 'Select a chunk'}
                </h2>
              </div>
              <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                {selectedChunk
                  ? `Chunk ${selectedChunkGlobalIndex + 1} of ${allChunks.length}`
                  : 'Choose a chunk to study.'}
              </div>
            </div>

            {selectedChunk ? (
              <div className="mt-6 space-y-6">
                {/* Scripture */}
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Scripture</p>
                      <p className="text-xs text-slate-500">Read-only passage for the selected chunk.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {selectedChunkChapter?.book} {selectedChunkChapter?.chapter}:{verseLabel(selectedChunk.startVerse, selectedChunk.endVerse)}
                    </span>
                  </div>
                  <div className="space-y-3 font-serif text-slate-800">
                    {selectedChunkChapter?.verses
                      .filter((v) => v.number >= selectedChunk.startVerse && v.number <= selectedChunk.endVerse)
                      .map((verse) => (
                        <p key={verse.number} className="leading-relaxed">
                          <span className="font-semibold text-slate-700">{verse.number}.</span> {verse.text}
                        </p>
                      ))}
                  </div>
                </div>

                {/* OIA Notes */}
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Study Notes (OIA)</h3>
                    <p className="text-xs text-slate-500">Observation · Interpretation · Application</p>
                  </div>
                  {[
                    { field: 'observation', label: 'Observation', placeholder: 'What does the text say? List facts, details, key words…' },
                    { field: 'interpretation', label: 'Interpretation', placeholder: 'What does it mean? Context, cross-references, theology…' },
                    { field: 'application', label: 'Application', placeholder: 'How does it apply? Personal response, life change…' },
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

                {/* Cross-references */}
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Cross-References</h3>
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
                  {(selectedChunk.crossReferences ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedChunk.crossReferences.map((ref) => (
                        <span
                          key={ref}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-800"
                        >
                          {ref}
                          <button
                            type="button"
                            onClick={() => removeCrossRef(selectedChunk.id, ref)}
                            className="ml-1 text-slate-500 hover:text-rose-600"
                            aria-label={`Remove ${ref}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Greek words */}
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Greek Word Studies</h3>
                      <p className="text-sm text-slate-500">Add lexical notes, look up Strong's entries.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addGreekWord(selectedChunk.id)}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Add Greek Word
                    </button>
                  </div>
                  <div className="space-y-4">
                    {selectedChunk.greekWords.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                        No Greek words yet. Add one to begin a lookup.
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
                                  if (e.key === 'Enter') { e.preventDefault(); lookupGreekWord(selectedChunk.id, word.id); }
                                }}
                                placeholder="G4102 or faith"
                                className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              />
                            </label>
                            <div className="flex items-end justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => lookupGreekWord(selectedChunk.id, word.id)}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >
                                {word.loading ? 'Looking up…' : 'Look Up'}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeGreekWord(selectedChunk.id, word.id)}
                                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <label className="text-sm text-slate-600">
                              Greek word
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
                                dangerouslySetInnerHTML={{ __html: word.definitionHtml }}
                              />
                            </details>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Prev / Next */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goToPreviousChunk}
                    disabled={selectedChunkGlobalIndex <= 0}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous Chunk
                  </button>
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
            ) : (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Select a chunk from the left panel to edit its notes and Greek studies.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

// ---------------------------------------------------------------------------
// SetupForm — extracted to avoid duplication between new-project and add-chapter flows
// ---------------------------------------------------------------------------
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

export default App;
