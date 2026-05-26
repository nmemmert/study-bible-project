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

const storageKey = (translation, book, chapter) => `bible-study-${translation}-${book}-${chapter}`;
const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function buildExportHtml(project) {
  const style = `
    body { font-family: Georgia, serif; color: #0f172a; margin: 0; padding: 32px; }
    .page { max-width: 900px; margin: auto; }
    h1, h2 { font-family: Georgia, serif; }
    h1 { margin-bottom: 0.5rem; }
    .chunk { margin-bottom: 2rem; padding: 1.25rem 1.5rem; border: 1px solid #cbd5e1; border-radius: 0.75rem; background: #ffffff; }
    .verse { margin: 0 0 0.75rem; line-height: 1.7; }
    .scripture-ref { font-weight: 700; margin-bottom: 0.75rem; }
    .notes, .greek { margin-top: 1rem; }
    .greek table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    .greek th, .greek td { border: 1px solid #d1d5db; padding: 0.65rem; text-align: left; }
    .greek th { background: #f8fafc; }
    .definition { margin-top: 0.75rem; font-size: 0.95rem; line-height: 1.6; }
    .definition-block { margin-top: 1rem; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #f8fafc; }
  `;

  const chunksHtml = project.chunks
    .map((chunk) => {
      const scripture = chunk.startVerse === chunk.endVerse
        ? `${project.book} ${project.chapter}:${chunk.startVerse}`
        : `${project.book} ${project.chapter}:${chunk.startVerse}-${chunk.endVerse}`;
      const versesText = project.verses
        .filter((verse) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse)
        .map((verse) => `<p class="verse"><strong>${verse.number}</strong> ${verse.text}</p>`)
        .join('');
      const notes = chunk.notes.trim().replace(/\n/g, '<br />') || '<em>No notes.</em>';
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
          <div class="notes"><strong>STUDY NOTES:</strong><p>${notes}</p></div>
          <div class="greek"><strong>GREEK WORDS:</strong>
            ${greekRows ? greekTable : '<p><em>No Greek word notes.</em></p>'}
            ${extendedDefinitions}
          </div>
        </section>
      `;
    })
    .join('');

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
    <h2>${project.translation} — ${project.book} ${project.chapter}</h2>
    ${chunksHtml}
  </div>
</body>
</html>`;
}

function wordTableHtml(rows) {
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

function extractPartOfSpeech(definitionHtml) {
  const match = /Part\(s\) of speech:\s*([^<]+)/i.exec(definitionHtml || '');
  if (match && match[1]) {
    return match[1].trim();
  }
  return '';
}

function htmlToPlainText(html = '') {
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

function createParagraphsFromText(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Paragraph({ children: [new TextRun({ text: line })] }));
}

function renderVerseContent(content) {
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

function parseBibleChapter(data) {
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
  const [currentPage, setCurrentPage] = useState('setup');
  const [saveStatus, setSaveStatus] = useState('');
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [loadingChapter, setLoadingChapter] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const saveTimerRef = useRef(null);

  useEffect(() => {
    fetch('https://bible.helloao.org/api/available_translations.json')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableTranslations(data);
        }
      })
      .catch(() => {
        // Keep default translation if API fails.
      });
  }, []);

  useEffect(() => {
    if (!titleEdited) {
      setSetup((current) => ({
        ...current,
        title: `${current.book} ${current.chapter} Study`,
      }));
    }
  }, [setup.book, setup.chapter, titleEdited]);

  useEffect(() => {
    const key = storageKey(setup.translation, setup.bookAbbrev, setup.chapter);
    const saved = window.localStorage.getItem(key);
    if (!saved) {
      return;
    }
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.bookAbbrev === setup.bookAbbrev && parsed.chapter === setup.chapter) {
        if (parsed.chunks?.length > 0 && !parsed.selectedChunkId) {
          parsed.selectedChunkId = parsed.chunks[0].id;
        }
        const resume = window.confirm('A saved study exists for this chapter. Resume studying? Press OK to continue studying, or Cancel to edit chunks.');
        setProject(parsed);
        setSetup({
          translation: parsed.translation,
          book: parsed.book,
          bookAbbrev: parsed.bookAbbrev,
          chapter: parsed.chapter,
          title: parsed.title,
        });
        setCurrentPage(resume ? 'study' : 'setup');
      }
    } catch {
      // Ignore invalid saved data.
    }
  }, []);

  useEffect(() => {
    if (!project) {
      return;
    }
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      const key = storageKey(project.translation, project.bookAbbrev, project.chapter);
      window.localStorage.setItem(key, JSON.stringify(project));
      setSaveStatus('Saved');
      window.setTimeout(() => setSaveStatus(''), 1400);
    }, 1000);
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [project]);

  const handleSetupField = (field, value) => {
    if (field === 'book') {
      const selected = bookOptions.find((book) => book.abbrev === value) ?? bookOptions[0];
      setSetup((current) => ({
        ...current,
        book: selected.name,
        bookAbbrev: selected.abbrev,
      }));
    } else {
      setSetup((current) => ({
        ...current,
        [field]: value,
      }));
    }
  };

  const createProjectFromChapter = (verses) => ({
    translation: setup.translation,
    book: setup.book,
    bookAbbrev: setup.bookAbbrev,
    chapter: setup.chapter,
    title: setup.title,
    verses,
    chunks: [],
    selectedChunkId: null,
  });

  const handleLoadChapter = async () => {
    if (!setup.bookAbbrev || !setup.chapter) {
      setErrorMessage('Please choose a book and chapter.');
      return;
    }
    setErrorMessage('');
    setLoadingChapter(true);
    try {
      const response = await fetch(`https://bible.helloao.org/api/${setup.translation}/${setup.bookAbbrev}/${setup.chapter}.json`);
      if (!response.ok) {
        throw new Error('Unable to load chapter.');
      }
      const data = await response.json();
      const verses = parseBibleChapter(data);
      if (!data || !Array.isArray(verses) || verses.length === 0) {
        throw new Error('Invalid Bible data returned.');
      }
      const key = storageKey(setup.translation, setup.bookAbbrev, setup.chapter);
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.bookAbbrev === setup.bookAbbrev && parsed.chapter === setup.chapter) {
          if (parsed.chunks?.length > 0 && !parsed.selectedChunkId) {
            parsed.selectedChunkId = parsed.chunks[0].id;
          }
          const resume = window.confirm('A saved study exists for this chapter. Resume saved project?');
          if (resume) {
            setProject(parsed);
            setSetup({
              translation: parsed.translation,
              book: parsed.book,
              bookAbbrev: parsed.bookAbbrev,
              chapter: parsed.chapter,
              title: parsed.title,
            });
            setCurrentPage('study');
            setLoadingChapter(false);
            return;
          }
        }
      }
      setProject(createProjectFromChapter(verses));
      setCurrentPage('setup');
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
    if (!project || project.chunks.length === 0) return;
    updateProject((current) => ({
      ...current,
      selectedChunkId: current.selectedChunkId || current.chunks[0]?.id || null,
    }));
    setCurrentPage('study');
  };

  const goToPreviousChunk = () => {
    if (!project?.chunks.length || !project.selectedChunkId) return;
    const index = project.chunks.findIndex((chunk) => chunk.id === project.selectedChunkId);
    if (index > 0) {
      updateProject((current) => ({ ...current, selectedChunkId: current.chunks[index - 1].id }));
    }
  };

  const goToNextChunk = () => {
    if (!project?.chunks.length || !project.selectedChunkId) return;
    const index = project.chunks.findIndex((chunk) => chunk.id === project.selectedChunkId);
    if (index >= 0 && index < project.chunks.length - 1) {
      updateProject((current) => ({ ...current, selectedChunkId: current.chunks[index + 1].id }));
    }
  };

  const addChunk = (start, end) => {
    if (!project) {
      return;
    }
    const overlap = project.chunks.find((chunk) => chunk.startVerse === start && chunk.endVerse === end);
    if (overlap) {
      setStatusMessage('That chunk already exists.');
      window.setTimeout(() => setStatusMessage(''), 1800);
      return;
    }
    const newChunk = {
      id: makeId(),
      startVerse: start,
      endVerse: end,
      notes: '',
      greekWords: [],
    };
    updateProject((current) => ({
      ...current,
      chunks: [...current.chunks, newChunk],
      selectedChunkId: newChunk.id,
    }));
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

  const selectedChunk = project?.chunks.find((chunk) => chunk.id === project.selectedChunkId) ?? project?.chunks[0] ?? null;

  const updateChunk = (chunkId, patch) => {
    updateProject((current) => ({
      ...current,
      chunks: current.chunks.map((chunk) => (chunk.id === chunkId ? { ...chunk, ...patch } : chunk)),
    }));
  };

  const updateChunkWord = (chunkId, wordId, patch) => {
    updateProject((current) => ({
      ...current,
      chunks: current.chunks.map((chunk) => {
        if (chunk.id !== chunkId) return chunk;
        return {
          ...chunk,
          greekWords: chunk.greekWords.map((word) => (word.id === wordId ? { ...word, ...patch } : word)),
        };
      }),
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
      chunks: current.chunks.map((chunk) =>
        chunk.id === chunkId
          ? { ...chunk, greekWords: [...chunk.greekWords, newWord] }
          : chunk
      ),
    }));
  };

  const removeGreekWord = (chunkId, wordId) => {
    updateProject((current) => ({
      ...current,
      chunks: current.chunks.map((chunk) =>
        chunk.id === chunkId
          ? { ...chunk, greekWords: chunk.greekWords.filter((word) => word.id !== wordId) }
          : chunk
      ),
    }));
  };

  const lookupGreekWord = async (chunkId, wordId) => {
    const chunk = project?.chunks.find((item) => item.id === chunkId);
    const word = chunk?.greekWords.find((item) => item.id === wordId);
    if (!word || !word.query.trim()) {
      return;
    }
    updateChunkWord(chunkId, wordId, { loading: true });
    try {
      const query = encodeURIComponent(word.query.trim());
      const response = await fetch(`https://bolls.life/dictionary-definition/BDBT/${query}/`);
      if (!response.ok) {
        throw new Error('Lookup failed.');
      }
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
    } catch (error) {
      updateChunkWord(chunkId, wordId, {
        shortDefinition: 'Lookup failed.',
      });
    } finally {
      updateChunkWord(chunkId, wordId, { loading: false });
    }
  };

  const moveChunk = (chunkId, direction) => {
    updateProject((current) => {
      const index = current.chunks.findIndex((chunk) => chunk.id === chunkId);
      if (index < 0) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.chunks.length) return current;
      const updated = [...current.chunks];
      const [removed] = updated.splice(index, 1);
      updated.splice(nextIndex, 0, removed);
      return {
        ...current,
        chunks: updated,
      };
    });
  };

  const deleteChunk = (chunkId) => {
    updateProject((current) => {
      const remaining = current.chunks.filter((chunk) => chunk.id !== chunkId);
      const nextSelected = current.selectedChunkId === chunkId ? remaining[0]?.id ?? null : current.selectedChunkId;
      return {
        ...current,
        chunks: remaining,
        selectedChunkId: nextSelected,
      };
    });
  };

  const exportChapter = () => {
    if (!project) return;
    const html = buildExportHtml(project);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.book}-${project.chapter}-study.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportChapterDocx = async () => {
    if (!project) return;
    const children = [
      new Paragraph({
        text: project.title,
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        text: `${project.translation} — ${project.book} ${project.chapter}`,
        spacing: { after: 300 },
      }),
    ];

    project.chunks.forEach((chunk) => {
      const scriptureHeading = chunk.startVerse === chunk.endVerse
        ? `${project.book} ${project.chapter}:${chunk.startVerse}`
        : `${project.book} ${project.chapter}:${chunk.startVerse}-${chunk.endVerse}`;

      children.push(new Paragraph({ text: scriptureHeading, heading: HeadingLevel.HEADING_2 }));
      project.verses
        .filter((verse) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse)
        .forEach((verse) => {
          children.push(new Paragraph({
            children: [
              new TextRun({ text: `${verse.number}. `, bold: true }),
              new TextRun({ text: verse.text }),
            ],
          }));
        });

      children.push(new Paragraph({ text: 'STUDY NOTES:', spacing: { before: 240, after: 120 }, bold: true }));
      children.push(...createParagraphsFromText(chunk.notes || 'No notes.'));
      children.push(new Paragraph({ text: 'GREEK WORDS:', spacing: { before: 240, after: 120 }, bold: true }));

      if (chunk.greekWords.length > 0) {
        const tableRows = [
          new TableRow({
            tableHeader: true,
            children: ['Strong', 'Greek', 'Transliteration', 'Part of Speech', 'Short Definition'].map((label) => new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ text: label, bold: true })],
            })),
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

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.book}-${project.chapter}-study.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const verseLabel = (start, end) => (start === end ? `${start}` : `${start}-${end}`);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {project && currentPage === 'study' ? (
              <button
                type="button"
                onClick={() => setCurrentPage('setup')}
                className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
              >
                ← Back to Chunks
              </button>
            ) : null}
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
              <h1 className="mt-2 text-2xl font-semibold">{project ? project.title : 'Create a new chapter study'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {project && (
              <button
                type="button"
                onClick={() => {
                  setProject(null);
                  setRangeStart(null);
                  setRangeEnd(null);
                  setErrorMessage('');
                  setStatusMessage('');
                }}
                className="rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15"
              >
                New Project
              </button>
            )}
            {project && (
              <div className="flex flex-wrap items-center gap-3">
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
              {loadingChapter ? <span>Loading…</span> : saveStatus ? <span className="text-emerald-300">{saveStatus}</span> : <span>&nbsp;</span>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!project ? (
          <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-panel">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Project Setup</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Pick a translation, chapter, and title. Load the chapter to begin structuring your study into chunks.
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Translation
                  <select
                    value={setup.translation}
                    onChange={(event) => handleSetupField('translation', event.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {availableTranslations.map((translation) => (
                      <option key={translation} value={translation}>
                        {translation}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Book
                  <select
                    value={setup.bookAbbrev}
                    onChange={(event) => handleSetupField('book', event.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  >
                    {bookOptions.map((book) => (
                      <option key={book.abbrev} value={book.abbrev}>
                        {book.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Chapter
                  <input
                    type="number"
                    min="1"
                    value={setup.chapter}
                    onChange={(event) => handleSetupField('chapter', event.target.value)}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Project title
                  <input
                    type="text"
                    value={setup.title}
                    onChange={(event) => {
                      setTitleEdited(true);
                      handleSetupField('title', event.target.value);
                    }}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </label>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  {errorMessage ? <span className="text-rose-500">{errorMessage}</span> : 'Start by loading the chapter text from HelloAO.'}
                </div>
                <button
                  type="button"
                  onClick={handleLoadChapter}
                  disabled={loadingChapter}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  {loadingChapter ? 'Loading...' : 'Load Chapter'}
                </button>
              </div>
            </div>
          </section>
        ) : currentPage === 'setup' ? (
          <section className="space-y-8">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Project Setup</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Pick a translation, chapter, and title. Load the chapter to begin structuring your study into chunks.
                  </p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Translation
                    <select
                      value={setup.translation}
                      onChange={(event) => handleSetupField('translation', event.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      {availableTranslations.map((translation) => (
                        <option key={translation} value={translation}>
                          {translation}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Book
                    <select
                      value={setup.bookAbbrev}
                      onChange={(event) => handleSetupField('book', event.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      {bookOptions.map((book) => (
                        <option key={book.abbrev} value={book.abbrev}>
                          {book.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Chapter
                    <input
                      type="number"
                      min="1"
                      value={setup.chapter}
                      onChange={(event) => handleSetupField('chapter', event.target.value)}
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                    Project title
                    <input
                      type="text"
                      value={setup.title}
                      onChange={(event) => {
                        setTitleEdited(true);
                        handleSetupField('title', event.target.value);
                      }}
                      className="mt-2 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-600">
                    {errorMessage ? <span className="text-rose-500">{errorMessage}</span> : 'Start by loading the chapter text from HelloAO.'}
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadChapter}
                    disabled={loadingChapter}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
                  >
                    {loadingChapter ? 'Loading...' : 'Load Chapter'}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-8 xl:grid-cols-[1.8fr_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Scripture & Chunks</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">{project.book} {project.chapter} ({project.translation})</h2>
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
                    <div className="max-h-[520px] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 scrollbar-thin">
                      {project.verses.map((verse) => {
                        const inRange = rangeStart !== null && (verse.number >= Math.min(rangeStart, rangeEnd) && verse.number <= Math.max(rangeStart, rangeEnd));
                        const inChunk = project.chunks.some((chunk) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse);
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
                      <span className="text-xs text-slate-500">{project.chunks.length} created</span>
                    </div>
                    <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-thin">
                      {project.chunks.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                          No chunks yet. Select verse ranges to add sections.
                        </div>
                      ) : (
                        project.chunks.map((chunk, index) => (
                          <div
                            key={chunk.id}
                            className={`rounded-3xl border p-4 ${project.selectedChunkId === chunk.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'} shadow-sm`}
                          >
                            <button
                              type="button"
                              onClick={() => updateProject((current) => ({ ...current, selectedChunkId: chunk.id }))}
                              className="mb-3 w-full text-left"
                            >
                              <p className="text-sm font-semibold text-slate-900">{project.book} {project.chapter}:{verseLabel(chunk.startVerse, chunk.endVerse)}</p>
                              <p className="mt-1 text-sm text-slate-600 truncate">{project.verses.find((verse) => verse.number === chunk.startVerse)?.text || ''}</p>
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
                                disabled={index === project.chunks.length - 1}
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
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={beginStudying}
                  disabled={project.chunks.length === 0}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  Begin Studying →
                </button>
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-8 xl:grid-cols-[260px_1fr]">
            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
              <div className="mb-6">
                <p className="text-sm font-medium text-slate-500">Chunk Navigation</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{project.chunks.length} chunks</h2>
              </div>
              <div className="space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto scrollbar-thin">
                {project.chunks.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No chunks available. Return to chunks to create a passage.
                  </div>
                ) : (
                  project.chunks.map((chunk) => {
                    const isSelected = project.selectedChunkId === chunk.id;
                    const hasContent = chunk.notes.trim() || chunk.greekWords.length > 0;
                    return (
                      <button
                        type="button"
                        key={chunk.id}
                        onClick={() => updateProject((current) => ({ ...current, selectedChunkId: chunk.id }))}
                        className={`group flex w-full flex-col gap-3 rounded-3xl border-l-4 p-4 text-left transition ${
                          isSelected ? 'border-amber-400 bg-amber-50' : 'border-transparent border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-slate-900">{project.book} {project.chapter}:{verseLabel(chunk.startVerse, chunk.endVerse)}</span>
                          {hasContent ? <span className="text-emerald-600">✓</span> : null}
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600 truncate">
                          {project.verses.find((verse) => verse.number === chunk.startVerse)?.text || ''}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Chunk editor</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{selectedChunk ? `Section ${verseLabel(selectedChunk.startVerse, selectedChunk.endVerse)}` : 'Select a chunk'}</h2>
                </div>
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {selectedChunk ? `Chunk ${project.chunks.findIndex((chunk) => chunk.id === selectedChunk.id) + 1} of ${project.chunks.length}` : 'Choose a chunk to study.'}
                </div>
              </div>
              {selectedChunk ? (
                <div className="mt-6 space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Scripture</p>
                        <p className="text-xs text-slate-500">Read-only passage for the selected chunk.</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {project.book} {project.chapter}:{verseLabel(selectedChunk.startVerse, selectedChunk.endVerse)}
                      </span>
                    </div>
                    <div className="space-y-3 font-serif text-slate-800">
                      {project.verses
                        .filter((verse) => verse.number >= selectedChunk.startVerse && verse.number <= selectedChunk.endVerse)
                        .map((verse) => (
                          <p key={verse.number} className="leading-relaxed">
                            <span className="font-semibold text-slate-700">{verse.number}.</span> {verse.text}
                          </p>
                        ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Study Notes</h3>
                        <p className="text-sm text-slate-500">Write your observations, cross-references, and teaching notes here.</p>
                      </div>
                    </div>
                    <textarea
                      value={selectedChunk.notes}
                      onChange={(event) => updateChunk(selectedChunk.id, { notes: event.target.value })}
                      rows={10}
                      placeholder="Write your observations, cross-references, and teaching notes here..."
                      className="w-full resize-y rounded-3xl border border-slate-300 bg-white px-4 py-4 text-sm leading-6 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">Greek Word Studies</h3>
                        <p className="text-sm text-slate-500">Add lexical notes, look up Strong's entries, and keep definitions with each chunk.</p>
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
                                  onChange={(event) => updateChunkWord(selectedChunk.id, word.id, { query: event.target.value })}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      lookupGreekWord(selectedChunk.id, word.id);
                                    }
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
                                  onChange={(event) => updateChunkWord(selectedChunk.id, word.id, { lexeme: event.target.value })}
                                  className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                />
                              </label>
                              <label className="text-sm text-slate-600">
                                Transliteration
                                <input
                                  type="text"
                                  value={word.transliteration}
                                  onChange={(event) => updateChunkWord(selectedChunk.id, word.id, { transliteration: event.target.value })}
                                  className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                />
                              </label>
                              <label className="text-sm text-slate-600">
                                Part of speech
                                <input
                                  type="text"
                                  value={word.partOfSpeech}
                                  onChange={(event) => updateChunkWord(selectedChunk.id, word.id, { partOfSpeech: event.target.value })}
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
                                  onChange={(event) => updateChunkWord(selectedChunk.id, word.id, { shortDefinition: event.target.value })}
                                  className="mt-2 block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                                />
                              </label>
                            </div>
                            {word.definitionHtml ? (
                              <details className="group mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <summary className="cursor-pointer text-sm font-semibold text-slate-900 transition hover:text-slate-700">
                                  Extended definition
                                </summary>
                                <div className="mt-3 text-sm leading-6 text-slate-700" dangerouslySetInnerHTML={{ __html: word.definitionHtml }} />
                              </details>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousChunk}
                      disabled={!project.selectedChunkId || project.chunks.findIndex((chunk) => chunk.id === project.selectedChunkId) === 0}
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ← Previous Chunk
                    </button>
                    <button
                      type="button"
                      onClick={goToNextChunk}
                      disabled={!project.selectedChunkId || project.chunks.findIndex((chunk) => chunk.id === project.selectedChunkId) === project.chunks.length - 1}
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
        )}
      </main>

    </div>
  );
};

export default App;
