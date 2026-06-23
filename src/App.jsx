import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import mammoth from 'mammoth';
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import {
  saveRemoteProject,
  deleteRemoteProject,
  listRemoteProjects,
  loadRemoteProject,
} from './syncService.js';

const COMMENTARY_OPTIONS = [
  { id: 'matthew-henry', name: 'Matthew Henry' },
  { id: 'john-gill', name: 'John Gill' },
  { id: 'jamieson-fausset-brown', name: 'Jamieson-Fausset-Brown' },
  { id: 'adam-clarke', name: 'Adam Clarke' },
  { id: 'keil-delitzsch', name: 'Keil & Delitzsch (OT)' },
  { id: 'tyndale', name: 'Tyndale Open Study Notes' },
];

const STUDY_TABS = [
  { id: 'notes', label: 'Notes' },
  { id: 'crossRefs', label: 'Cross-Refs' },
  { id: 'wordStudy', label: 'Word Study' },
  { id: 'commentary', label: 'Commentary' },
  { id: 'script', label: 'Script' },
];

const bookOptions = [
  { name: 'Genesis', abbrev: 'GEN' },
  { name: 'Exodus', abbrev: 'EXO' },
  { name: 'Leviticus', abbrev: 'LEV' },
  { name: 'Numbers', abbrev: 'NUM' },
  { name: 'Deuteronomy', abbrev: 'DEU' },
  { name: 'Joshua', abbrev: 'JOS' },
  { name: 'Judges', abbrev: 'JDG' },
  { name: 'Ruth', abbrev: 'RUT' },
  { name: '1 Samuel', abbrev: '1SA' },
  { name: '2 Samuel', abbrev: '2SA' },
  { name: '1 Kings', abbrev: '1KI' },
  { name: '2 Kings', abbrev: '2KI' },
  { name: '1 Chronicles', abbrev: '1CH' },
  { name: '2 Chronicles', abbrev: '2CH' },
  { name: 'Ezra', abbrev: 'EZR' },
  { name: 'Nehemiah', abbrev: 'NEH' },
  { name: 'Esther', abbrev: 'EST' },
  { name: 'Job', abbrev: 'JOB' },
  { name: 'Psalms', abbrev: 'PSA' },
  { name: 'Proverbs', abbrev: 'PRO' },
  { name: 'Ecclesiastes', abbrev: 'ECC' },
  { name: 'Song', abbrev: 'SNG' },
  { name: 'Isaiah', abbrev: 'ISA' },
  { name: 'Jeremiah', abbrev: 'JER' },
  { name: 'Lamentations', abbrev: 'LAM' },
  { name: 'Ezekiel', abbrev: 'EZK' },
  { name: 'Daniel', abbrev: 'DAN' },
  { name: 'Hosea', abbrev: 'HOS' },
  { name: 'Joel', abbrev: 'JOL' },
  { name: 'Amos', abbrev: 'AMO' },
  { name: 'Obadiah', abbrev: 'OBA' },
  { name: 'Jonah', abbrev: 'JON' },
  { name: 'Micah', abbrev: 'MIC' },
  { name: 'Nahum', abbrev: 'NAM' },
  { name: 'Habakkuk', abbrev: 'HAB' },
  { name: 'Zephaniah', abbrev: 'ZEP' },
  { name: 'Haggai', abbrev: 'HAG' },
  { name: 'Zechariah', abbrev: 'ZEC' },
  { name: 'Malachi', abbrev: 'MAL' },
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

const NT_BOOK_NUMBER = {
  MAT: 40, MRK: 41, LUK: 42, JHN: 43, ACT: 44,
  ROM: 45, '1CO': 46, '2CO': 47, GAL: 48, EPH: 49,
  PHP: 50, COL: 51, '1TH': 52, '2TH': 53, '1TI': 54,
  '2TI': 55, TIT: 56, PHM: 57, HEB: 58, JAS: 59,
  '1PE': 60, '2PE': 61, '1JN': 62, '2JN': 63, '3JN': 64,
  JUD: 65, REV: 66,
};

// ---------------------------------------------------------------------------
// Stable utility exports (used by tests and other modules)
// ---------------------------------------------------------------------------

export const storageKey = (translation, book, chapter) => `bible-study-${translation}-${book}-${chapter}`;
export const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

// ---------------------------------------------------------------------------
// Migration helpers (exported for testing)
// ---------------------------------------------------------------------------

export function migrateChunk(chunk) {
  if (chunk.observation !== undefined) {
    return {
      ...chunk,
      spilloverEndVerse: Number.isInteger(chunk.spilloverEndVerse) ? chunk.spilloverEndVerse : null,
      generalNotes: chunk.generalNotes ?? '',
      episodeNumber: chunk.episodeNumber ?? '',
      episodeTitle: chunk.episodeTitle ?? '',
      finalScript: chunk.finalScript ?? '',
      tags: chunk.tags ?? [],
    }; // already new format
  }
  return {
    ...chunk,
    observation: chunk.notes ?? '',
    interpretation: '',
    application: '',
    crossReferences: [],
    tags: [],
    spilloverEndVerse: null,
    generalNotes: '',
    episodeNumber: '',
    episodeTitle: '',
    finalScript: '',
    notes: undefined,
  };
}

function chunkSpansNextChapter(project, startChapterIndex, chunk) {
  if (!project || !Array.isArray(project.chapters)) return false;
  if (!Number.isInteger(chunk?.spilloverEndVerse)) return false;
  if (startChapterIndex < 0 || startChapterIndex >= project.chapters.length - 1) return false;
  const startChapter = project.chapters[startChapterIndex];
  const nextChapter = project.chapters[startChapterIndex + 1];
  return startChapter?.bookAbbrev && startChapter.bookAbbrev === nextChapter?.bookAbbrev;
}

function formatChunkReference(project, startChapterIndex, chunk, separator = '-') {
  if (!project || !chunk) return '';
  const startChapter = project.chapters?.[startChapterIndex];
  if (!startChapter) return '';

  if (chunkSpansNextChapter(project, startChapterIndex, chunk)) {
    const nextChapter = project.chapters[startChapterIndex + 1];
    return `${startChapter.book} ${startChapter.chapter}:${chunk.startVerse}${separator}${nextChapter.chapter}:${chunk.spilloverEndVerse}`;
  }

  if (chunk.startVerse === chunk.endVerse) {
    return `${startChapter.book} ${startChapter.chapter}:${chunk.startVerse}`;
  }
  return `${startChapter.book} ${startChapter.chapter}:${chunk.startVerse}${separator}${chunk.endVerse}`;
}

function getChunkVerseEntries(project, startChapterIndex, chunk) {
  if (!project || !chunk) return [];
  const startChapter = project.chapters?.[startChapterIndex];
  if (!startChapter) return [];

  const startVerses = (startChapter.verses ?? [])
    .filter((verse) => verse.number >= chunk.startVerse && verse.number <= chunk.endVerse)
    .map((verse) => ({
      book: startChapter.book,
      chapter: startChapter.chapter,
      ...verse,
    }));

  if (!chunkSpansNextChapter(project, startChapterIndex, chunk)) {
    return startVerses;
  }

  const nextChapter = project.chapters[startChapterIndex + 1];
  const spilloverVerses = (nextChapter.verses ?? [])
    .filter((verse) => verse.number >= 1 && verse.number <= chunk.spilloverEndVerse)
    .map((verse) => ({
      book: nextChapter.book,
      chapter: nextChapter.chapter,
      ...verse,
    }));

  return [...startVerses, ...spilloverVerses];
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
  // Honour an already-stamped lastEdited (e.g. from autosave) so localStorage
  // and the server always receive the identical timestamp.
  const updated = { ...project, lastEdited: project.lastEdited ?? Date.now() };
  window.localStorage.setItem(projectKey(updated.id), JSON.stringify(updated));
  const index = loadProjectIndex();
  const existing = index.findIndex((e) => e.id === updated.id);
  const tags = Array.from(
    new Set(
      (updated.chapters ?? [])
        .flatMap((ch) => ch.chunks ?? [])
        .flatMap((chunk) => chunk.tags ?? []),
    ),
  );
  const summary = {
    id: updated.id,
    title: updated.title,
    lastEdited: updated.lastEdited,
    chapterSummary: buildChapterSummary(updated),
    tags,
  };
  if (existing >= 0) {
    index[existing] = summary;
  } else {
    index.push(summary);
  }
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  return updated; // caller can use this exact object for the server PUT
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

  const chunksHtml = chapters.map((ch, chapterIndex) => {
    const chapterHeader = `<h2 class="chapter-heading">${ch.book} ${ch.chapter}</h2>`;
    const chunkSections = ch.chunks.map((chunk) => {
      const scripture = formatChunkReference(project, chapterIndex, chunk, '-');
      const versesText = getChunkVerseEntries(project, chapterIndex, chunk)
        .map((verse) => `<p class="verse"><strong>${verse.chapter}:${verse.number}</strong> ${verse.text}</p>`)
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
        .map((word) => {
          if (word.definitionHtml) {
            return `
              <div class="definition-block">
                <p><strong>${word.strongNumber} — ${word.lexeme || ''}</strong></p>
                <div class="definition">${word.definitionHtml}</div>
              </div>
            `;
          }
          if ((word.shortDefinition === 'No definition found.' || word.shortDefinition === 'Lookup failed.') && !word.lexeme && !word.definitionHtml && word.query) {
            const raw = word.query.trim();
            const normalized = /^\d+$/.test(raw) ? `G${raw}` : raw.toUpperCase();
            const isStrongs = /^G\d+$/.test(normalized);
            const num = isStrongs ? normalized.slice(1) : null;
            const links = isStrongs && num
              ? `<a href="https://biblehub.com/greek/${num}.htm">BibleHub</a> · <a href="https://www.blueletterbible.org/lexicon/g${num}/esv/0-1/">Blue Letter Bible</a> · <a href="https://www.studylight.org/lexicons/eng/greek/${num}.html">StudyLight</a>`
              : `<a href="https://biblehub.com/search.php?q=${encodeURIComponent(raw)}">BibleHub</a> · <a href="https://www.blueletterbible.org/search/search.cfm?Criteria=${encodeURIComponent(raw)}&t=KJV#s=s_lexiconc">Blue Letter Bible</a>`;
            return `
              <div class="definition-block" style="border-color:#fcd34d;background:#fffbeb;">
                <p><strong>${raw}</strong> — definition not found in auto-lookup</p>
                <p style="margin-top:0.5rem;font-size:0.9rem;">Look it up manually: ${links}</p>
              </div>
            `;
          }
          return '';
        })
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

const DOCX_ACCENT = 'C9A84C'; // antique gold
const DOCX_HEADING_FONT = 'Cormorant Garamond';
const DOCX_BODY_FONT = 'Lora';

export function sectionLabel(text) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        color: DOCX_ACCENT,
        font: DOCX_BODY_FONT,
        size: 20,
        characterSpacing: 20,
      }),
    ],
  });
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
    if (typeof content.text === 'string') {
      return content.text;
    }
    return '';
  }
  return '';
}

function buildChunkBodies(project) {
  const chapters = Array.isArray(project.chapters) ? project.chapters : [];
  let chunkIndex = 0;
  return chapters.map((ch, chapterIndex) => {
    return ch.chunks.map((chunk) => {
      chunkIndex += 1;
      const ref = formatChunkReference(project, chapterIndex, chunk, '–');

      const verses = getChunkVerseEntries(project, chapterIndex, chunk)
        .map((v) => `${v.chapter}:${v.number} ${v.text}`)
        .join('\n');

      const observation = (chunk.observation ?? '').trim() || 'No observation.';
      const interpretation = (chunk.interpretation ?? '').trim() || 'No interpretation.';
      const application = (chunk.application ?? '').trim() || 'No application.';

      const crossRefs = (chunk.crossReferences ?? []).length > 0
        ? chunk.crossReferences.join(', ')
        : 'None.';

      const generalNotes = (chunk.generalNotes ?? '').trim();
      const episodeLabelLine = (chunk.episodeNumber ?? '').trim() || (chunk.episodeTitle ?? '').trim()
        ? `Episode: ${[chunk.episodeNumber?.trim(), chunk.episodeTitle?.trim()].filter(Boolean).join(' — ')}\n`
        : '';

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
${episodeLabelLine}
Scripture:
${verses}
${generalNotes ? `\nBackground / General Notes:\n${generalNotes}\n` : ''}
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

  return header + buildChunkBodies(project);
}

export function buildPronunciationGuide(project) {
  const chapters = Array.isArray(project.chapters) ? project.chapters : [];
  const lines = [];
  chapters.forEach((ch) => {
    ch.chunks.forEach((chunk) => {
      (chunk.greekWords ?? []).forEach((word) => {
        const gloss = word.shortDefinition || word.englishGloss || '';
        const lexeme = word.lexeme || '';
        const translit = word.transliteration || '';
        if (!lexeme && !translit) return;
        const label = gloss ? `${gloss} — ` : '';
        lines.push(`${label}${lexeme}${translit ? ` (${translit})` : ''}`);
      });
    });
  });
  if (lines.length === 0) return 'No Greek/Hebrew words collected yet.';
  return lines.join('\n');
}

export function buildPodcastPrompt(project) {
  const chapters = Array.isArray(project.chapters) ? project.chapters : [];
  const chapterLabel = chapters.map((ch) => `${ch.book} ${ch.chapter}`).join(', ');
  const episodeLabel = 'EPISODE';

  const header = `I'm recording an episode of my Bible study podcast "Verse by Verse with Nate: A Journey Through Scripture" and need a full script written from my study notes below.

Please write the script in this exact structure, using the section markers and tone shown:

VERSE BY VERSE WITH NATE
A Journey Through Scripture
${episodeLabel}
${chapterLabel} (${project.translation})  ·  [estimate XX–XX minutes based on content]

✝  OPENING PRAYER
[Pause before opening the text — invite God into the study]
A short prayer (4-6 sentences) tying into the themes of this passage.

— ✦ —

🎙️  COLD OPEN
[Co-host delivers the cold open solo — hands off to Nate at the end]
A few short punchy lines previewing the passage and its hook, ending with a hand-off line introducing Nate and the show.

— ✦ —

📖  SEGMENT [N] — [SEGMENT TITLE]
[Brief stage direction in brackets]
One segment per passage chunk (use the chunk reference, observation, interpretation, and application notes below as the raw material). Conversational, spoken-word style — not academic prose. Work through the text the way Nate would talk it through out loud, weaving in the OIA notes and cross-references naturally.

— ✦ —

📖  SEGMENT [N] — GREEK WORD STUDY
[Work through the key terms — keep it vivid, help the words come alive]
For each Greek/Hebrew word collected below, a block in this format:

[English Gloss] — [English meaning]
[DO NOT READ: original-language word (transliteration) — part of speech]
2-4 sentences unpacking the word's meaning and why it matters for this passage, conversational tone.

— ✦ —

💬  DISCUSSION QUESTIONS
[From the study guide — ${chapterLabel}]
3 reflection questions drawn from the application notes, numbered.

— ✦ —

✦  CLOSING
[Grounded and direct — send them away with something to carry]
A closing reflection that ties the segments together, a short pull-quote from the passage with its reference, then sign off with:
"I'm Nate, and this is Verse by Verse with Nate: A Journey Through Scripture."
"Until next time — keep studying verse by verse, and nugget by nugget."

— End of Episode —

Verse by Verse with Nate  ·  ${episodeLabel}  ·  ${chapterLabel}

---

Here are my study notes, organised by passage chunk, including my OIA notes, cross-references, and Greek/Hebrew word research:

PROJECT: ${project.title}
TRANSLATION: ${project.translation}
PASSAGE: ${chapterLabel}
`;

  return header + buildChunkBodies(project);
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

// Common short-form aliases for typed-in cross-references (e.g. "Rom 3:23")
const BOOK_NAME_ALIASES = {
  'gen': 'GEN', 'genesis': 'GEN', 'exo': 'EXO', 'exod': 'EXO', 'exodus': 'EXO',
  'lev': 'LEV', 'leviticus': 'LEV', 'num': 'NUM', 'numbers': 'NUM',
  'deut': 'DEU', 'deuteronomy': 'DEU', 'josh': 'JOS', 'joshua': 'JOS',
  'judg': 'JDG', 'judges': 'JDG', 'ruth': 'RUT',
  '1 sam': '1SA', '1 samuel': '1SA', '2 sam': '2SA', '2 samuel': '2SA',
  '1 kgs': '1KI', '1 kings': '1KI', '2 kgs': '2KI', '2 kings': '2KI',
  '1 chr': '1CH', '1 chronicles': '1CH', '2 chr': '2CH', '2 chronicles': '2CH',
  'ezra': 'EZR', 'neh': 'NEH', 'nehemiah': 'NEH', 'esth': 'EST', 'esther': 'EST',
  'job': 'JOB', 'ps': 'PSA', 'psa': 'PSA', 'psalm': 'PSA', 'psalms': 'PSA',
  'prov': 'PRO', 'proverbs': 'PRO', 'eccl': 'ECC', 'ecclesiastes': 'ECC',
  'song': 'SNG', 'isa': 'ISA', 'isaiah': 'ISA', 'jer': 'JER', 'jeremiah': 'JER',
  'lam': 'LAM', 'lamentations': 'LAM', 'ezek': 'EZK', 'ezekiel': 'EZK',
  'dan': 'DAN', 'daniel': 'DAN', 'hos': 'HOS', 'hosea': 'HOS', 'joel': 'JOL',
  'amos': 'AMO', 'obad': 'OBA', 'obadiah': 'OBA', 'jonah': 'JON', 'mic': 'MIC',
  'micah': 'MIC', 'nah': 'NAM', 'nahum': 'NAM', 'hab': 'HAB', 'habakkuk': 'HAB',
  'zeph': 'ZEP', 'zephaniah': 'ZEP', 'hag': 'HAG', 'haggai': 'HAG',
  'zech': 'ZEC', 'zechariah': 'ZEC', 'mal': 'MAL', 'malachi': 'MAL',
  'matt': 'MAT', 'mt': 'MAT', 'matthew': 'MAT', 'mark': 'MRK', 'mk': 'MRK',
  'luke': 'LUK', 'lk': 'LUK', 'john': 'JHN', 'jn': 'JHN', 'acts': 'ACT',
  'rom': 'ROM', 'romans': 'ROM', '1 cor': '1CO', '1 corinthians': '1CO',
  '2 cor': '2CO', '2 corinthians': '2CO', 'gal': 'GAL', 'galatians': 'GAL',
  'eph': 'EPH', 'ephesians': 'EPH', 'phil': 'PHP', 'philippians': 'PHP',
  'col': 'COL', 'colossians': 'COL', '1 thess': '1TH', '1 thessalonians': '1TH',
  '2 thess': '2TH', '2 thessalonians': '2TH', '1 tim': '1TI', '1 timothy': '1TI',
  '2 tim': '2TI', '2 timothy': '2TI', 'titus': 'TIT', 'phlm': 'PHM', 'philemon': 'PHM',
  'heb': 'HEB', 'hebrews': 'HEB', 'jas': 'JAS', 'james': 'JAS',
  '1 pet': '1PE', '1 peter': '1PE', '2 pet': '2PE', '2 peter': '2PE',
  '1 jn': '1JN', '1 john': '1JN', '2 jn': '2JN', '2 john': '2JN',
  '3 jn': '3JN', '3 john': '3JN', 'jude': 'JUD', 'rev': 'REV', 'revelation': 'REV',
};

bookOptions.forEach((b) => {
  BOOK_NAME_ALIASES[b.name.toLowerCase()] = b.abbrev;
});

// Parses strings like "Romans 3:23", "1 Timothy 3:2-7" into { bookAbbrev, chapter, verse, endVerse }
function parseCrossRefString(ref) {
  const match = ref.trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const [, bookPart, chapter, verse, endVerse] = match;
  const abbrev = BOOK_NAME_ALIASES[bookPart.trim().toLowerCase()];
  if (!abbrev) return null;
  return {
    bookAbbrev: abbrev,
    chapter: Number(chapter),
    verse: Number(verse),
    endVerse: endVerse ? Number(endVerse) : Number(verse),
  };
}

// A cross-reference chip that fetches and shows the referenced verse text on hover
function CrossRefChip({ label, onRemove, loadVerseText }) {
  const [hovered, setHovered] = useState(false);
  const [verseText, setVerseText] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hovered || verseText || error) return;
    let cancelled = false;
    loadVerseText(label)
      .then((text) => { if (!cancelled) setVerseText(text || 'Verse text unavailable.'); })
      .catch(() => { if (!cancelled) setError('Verse text unavailable.'); });
    return () => { cancelled = true; };
  }, [hovered]);

  return (
    <span
      className="relative inline-flex items-center gap-1 rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-800"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 text-slate-500 hover:text-rose-600"
          aria-label={`Remove ${label}`}
        >
          ×
        </button>
      )}
      {hovered && (
        <span className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-xl border border-slate-300 bg-white p-3 text-xs font-normal normal-case text-slate-700 shadow-lg">
          {error || verseText || 'Loading...'}
        </span>
      )}
    </span>
  );
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
  const [typedChunkStart, setTypedChunkStart] = useState('');
  const [typedChunkEnd, setTypedChunkEnd] = useState('');
  const [typedChunkNextEnd, setTypedChunkNextEnd] = useState('');
  const [clickedSpanNextEnd, setClickedSpanNextEnd] = useState('');
  const [typedChunkBulk, setTypedChunkBulk] = useState('');
  const saveTimerRef = useRef(null);
  const [syncStatus, setSyncStatus] = useState('');   // '' | 'syncing' | 'synced' | 'error'
  const [remoteOnlyProjects, setRemoteOnlyProjects] = useState([]); // projects on server not in localStorage
  const [staleLocalProjects, setStaleLocalProjects] = useState([]); // projects where server is newer
  const [suggestingGreekForChunkId, setSuggestingGreekForChunkId] = useState(null);
  const [suggestingHebrewForChunkId, setSuggestingHebrewForChunkId] = useState(null);
  // suggestModal: null | { chunkId, words: [{ strongKey, lexeme, translit, def }] }
  const [suggestModal, setSuggestModal] = useState(null);
  const [suggestSelection, setSuggestSelection] = useState(new Set());
  const [homeSearch, setHomeSearch] = useState('');
  const [homeSort, setHomeSort] = useState('recent'); // 'recent' | 'title' | 'passage'
  const [homeTagFilter, setHomeTagFilter] = useState('');
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [readerBookAbbrev, setReaderBookAbbrev] = useState(bookOptions[0].abbrev);
  const [readerChapter, setReaderChapter] = useState(1);
  const [readerVerses, setReaderVerses] = useState([]);
  const [readerTotalChapters, setReaderTotalChapters] = useState(1);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState('');
  const [readerInterlinear, setReaderInterlinear] = useState(null); // full book interlinear
  const [readerInterlinearLoading, setReaderInterlinearLoading] = useState(false);
  const [readerSelectedVerse, setReaderSelectedVerse] = useState(null); // verse number with open interlinear panel
  const _readerInterlinearCacheRef = useRef({});
  const [readerFontSize, setReaderFontSize] = useState(1); // em multiplier: 0.875 | 1 | 1.125 | 1.25
  const [readerBookmarks, setReaderBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('reader-bookmarks') || '{}'); } catch { return {}; }
  });
  const [readerCrossRefs, setReaderCrossRefs] = useState(null);
  const [readerCrossRefsLoading, setReaderCrossRefsLoading] = useState(false);
  const [readerShowCrossRefs, setReaderShowCrossRefs] = useState(false);
  const _readerCrossRefCacheRef = useRef({});
  const [readerSearch, setReaderSearch] = useState('');
  const [readerSearchActive, setReaderSearchActive] = useState(false);
  const [audioBook, setAudioBook] = useState(bookOptions[0].abbrev);
  const [audioNarrator, setAudioNarrator] = useState('souer');
  const [audioState, setAudioState] = useState({ status: 'idle', chapter: 0, total: 0 });
  const [readerAudioState, setReaderAudioState] = useState({ status: 'idle', chapter: 0 });
  const audioRef = useRef(null);
  const audioModeRef = useRef('book'); // 'book' | 'reader' — which player owns audioRef
  const audioBookRef = useRef(audioBook);
  const audioNarratorRef = useRef(audioNarrator);
  const audioStateRef = useRef(audioState);
  audioBookRef.current = audioBook;
  audioNarratorRef.current = audioNarrator;
  audioStateRef.current = audioState;

  const playAudioChapter = async (abbrev, chapterNum, narrator) => {
    const res = await fetch(`https://bible.helloao.org/api/BSB/${abbrev}/${chapterNum}.json`);
    if (!res.ok) throw new Error('Failed to load chapter audio');
    const data = await res.json();
    const total = data.book?.numberOfChapters ?? chapterNum;
    const url = data.thisChapterAudioLinks?.[narrator];
    if (!url) throw new Error('Audio not available for this narrator');
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        if (audioModeRef.current === 'reader') {
          setReaderAudioState({ status: 'idle', chapter: 0 });
          return;
        }
        const nextChapter = audioStateRef.current.chapter + 1;
        if (nextChapter > audioStateRef.current.total) {
          setAudioState({ status: 'idle', chapter: 0, total: 0 });
          return;
        }
        playAudioChapter(audioBookRef.current, nextChapter, audioNarratorRef.current).catch(() =>
          setAudioState({ status: 'error', chapter: 0, total: 0 }),
        );
      });
    }
    const audioEl = audioRef.current;
    audioEl.src = url;
    await audioEl.play();
    if (audioModeRef.current === 'reader') {
      setReaderAudioState({ status: 'playing', chapter: chapterNum });
    } else {
      setAudioState({ status: 'playing', chapter: chapterNum, total });
    }
  };

  const handlePlayBookAudio = async () => {
    audioModeRef.current = 'book';
    try {
      await playAudioChapter(audioBook, 1, audioNarrator);
    } catch {
      setAudioState({ status: 'error', chapter: 0, total: 0 });
    }
  };

  const handleStopBookAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setAudioState({ status: 'idle', chapter: 0, total: 0 });
    setReaderAudioState({ status: 'idle', chapter: 0 });
  };

  const handleToggleBookAudioPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setAudioState((prev) => ({ ...prev, status: 'playing' }));
    } else {
      audioRef.current.pause();
      setAudioState((prev) => ({ ...prev, status: 'paused' }));
    }
  };

  const handlePlayReaderAudio = async () => {
    audioModeRef.current = 'reader';
    try {
      await playAudioChapter(readerBookAbbrev, readerChapter, audioNarrator);
    } catch {
      setReaderAudioState({ status: 'error', chapter: 0 });
    }
  };

  const handleToggleReaderAudioPause = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setReaderAudioState((prev) => ({ ...prev, status: 'playing' }));
    } else {
      audioRef.current.pause();
      setReaderAudioState((prev) => ({ ...prev, status: 'paused' }));
    }
  };

  // Auto-switch the reader's audio to match the book/chapter currently being read.
  useEffect(() => {
    if (audioModeRef.current !== 'reader') return;
    if (readerAudioState.status !== 'playing' && readerAudioState.status !== 'paused') return;
    if (readerAudioState.chapter === readerChapter) return;
    const wasPaused = readerAudioState.status === 'paused';
    playAudioChapter(readerBookAbbrev, readerChapter, audioNarrator)
      .then(() => {
        if (wasPaused && audioRef.current) {
          audioRef.current.pause();
          setReaderAudioState((prev) => ({ ...prev, status: 'paused' }));
        }
      })
      .catch(() => setReaderAudioState({ status: 'error', chapter: 0 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerBookAbbrev, readerChapter]);

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);
  const [studyLayout, setStudyLayout] = useState(
    () => localStorage.getItem('studyLayout') || 'stacked',
  ); // 'stacked' | 'split'
  const [activeStudyTab, setActiveStudyTab] = useState(
    () => localStorage.getItem('activeStudyTab') || 'notes',
  );

  useEffect(() => {
    localStorage.setItem('studyLayout', studyLayout);
  }, [studyLayout]);

  useEffect(() => {
    localStorage.setItem('activeStudyTab', activeStudyTab);
  }, [activeStudyTab]);
  const [verseSearch, setVerseSearch] = useState('');
  const [collapsedSections, setCollapsedSections] = useState({});
  const [commentarySource, setCommentarySource] = useState('matthew-henry');
  const [commentaryData, setCommentaryData] = useState(null); // { content: [...] } for current chapter
  const [commentaryLoading, setCommentaryLoading] = useState(false);
  const [commentaryError, setCommentaryError] = useState('');
  const _commentaryCacheRef = useRef({});
  const [interlinearData, setInterlinearData] = useState(null);
  const [interlinearLoading, setInterlinearLoading] = useState(false);
  const [interlinearError, setInterlinearError] = useState('');
  const _interlinearCacheRef = useRef({});

  const loadInterlinearChapter = async (bookAbbrev, chapterNumber) => {
    if (_interlinearCacheRef.current[bookAbbrev]) return _interlinearCacheRef.current[bookAbbrev];
    const res = await fetch(`/interlinear/${bookAbbrev}.json`);
    if (!res.ok) throw new Error('No interlinear data for this book.');
    const data = await res.json();
    _interlinearCacheRef.current[bookAbbrev] = data;
    return data;
  };

  const loadCommentaryChapter = async (commentaryId, bookAbbrev, chapterNumber) => {
    const cacheKey = `${commentaryId}/${bookAbbrev}/${chapterNumber}`;
    if (_commentaryCacheRef.current[cacheKey]) return _commentaryCacheRef.current[cacheKey];
    const res = await fetch(`https://bible.helloao.org/api/c/${commentaryId}/${bookAbbrev}/${chapterNumber}.json`);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('json')) throw new Error(`No ${commentaryId} commentary for this chapter.`);
    const data = await res.json();
    _commentaryCacheRef.current[cacheKey] = data;
    return data;
  };

  // ---------------------------------------------------------------------------
  // Bible reader (read-only browsing, separate from study projects)
  // ---------------------------------------------------------------------------

  const loadReaderChapter = async (bookAbbrev, chapterNumber) => {
    setReaderLoading(true);
    setReaderError('');
    try {
      const res = await fetch(`https://bible.helloao.org/api/BSB/${bookAbbrev}/${chapterNumber}.json`);
      if (!res.ok) throw new Error('Unable to load chapter.');
      const data = await res.json();
      const verses = parseBibleChapter(data);
      if (!Array.isArray(verses) || verses.length === 0) {
        throw new Error('Invalid Bible data returned.');
      }
      setReaderVerses(verses);
      setReaderTotalChapters(data.book?.numberOfChapters ?? chapterNumber);
    } catch (err) {
      setReaderError(err.message || 'Failed to load chapter.');
      setReaderVerses([]);
    } finally {
      setReaderLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== 'reader') return;
    loadReaderChapter(readerBookAbbrev, readerChapter);
  }, [currentPage, readerBookAbbrev, readerChapter]);

  const openBibleReader = () => {
    setCurrentPage('reader');
  };

  const readerGoToPreviousChapter = () => {
    if (readerChapter > 1) { setReaderChapter((c) => c - 1); setReaderSelectedVerse(null); setReaderCrossRefs(null); setReaderSearch(''); setReaderSearchActive(false); }
  };

  const readerGoToNextChapter = () => {
    if (readerChapter < readerTotalChapters) { setReaderChapter((c) => c + 1); setReaderSelectedVerse(null); setReaderCrossRefs(null); setReaderSearch(''); setReaderSearchActive(false); }
  };

  const handleReaderBookChange = (abbrev) => {
    setReaderBookAbbrev(abbrev);
    setReaderChapter(1);
    setReaderSelectedVerse(null);
    setReaderInterlinear(null);
    setReaderCrossRefs(null);
    setReaderSearch('');
    setReaderSearchActive(false);
  };

  const loadReaderInterlinear = async (bookAbbrev) => {
    if (_readerInterlinearCacheRef.current[bookAbbrev]) {
      setReaderInterlinear(_readerInterlinearCacheRef.current[bookAbbrev]);
      return;
    }
    setReaderInterlinearLoading(true);
    try {
      const res = await fetch(`/interlinear/${bookAbbrev}.json`);
      if (!res.ok) throw new Error('no interlinear');
      const data = await res.json();
      _readerInterlinearCacheRef.current[bookAbbrev] = data;
      setReaderInterlinear(data);
    } catch {
      setReaderInterlinear(null);
    } finally {
      setReaderInterlinearLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== 'reader') return;
    loadReaderInterlinear(readerBookAbbrev);
    setReaderSelectedVerse(null);
  }, [currentPage, readerBookAbbrev]);

  useEffect(() => {
    if (currentPage !== 'reader' || !readerShowCrossRefs) return;
    loadReaderCrossRefs(readerBookAbbrev, readerChapter);
  }, [currentPage, readerBookAbbrev, readerChapter, readerShowCrossRefs]);

  const speakOriginalWord = (word, strongsNum) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const lang = strongsNum?.startsWith('H') ? 'he-IL' : 'el-GR';
    const utt = new SpeechSynthesisUtterance(word + '   ');
    utt.lang = lang;
    // prefer a matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang.startsWith(lang.split('-')[0]));
    if (match) utt.voice = match;
    window.speechSynthesis.speak(utt);
  };

  // Reader helpers: bookmarks, cross-refs, copy verse
  const BOOKMARK_COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff'];

  const toggleReaderBookmark = (verseKey) => {
    setReaderBookmarks((prev) => {
      const next = { ...prev };
      if (next[verseKey]) {
        delete next[verseKey];
      } else {
        const usedColors = Object.values(next);
        const color = BOOKMARK_COLORS.find((c) => !usedColors.includes(c)) ?? BOOKMARK_COLORS[0];
        next[verseKey] = color;
      }
      try { localStorage.setItem('reader-bookmarks', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const cycleBookmarkColor = (verseKey) => {
    setReaderBookmarks((prev) => {
      const cur = prev[verseKey];
      if (!cur) return prev;
      const idx = BOOKMARK_COLORS.indexOf(cur);
      const next = { ...prev, [verseKey]: BOOKMARK_COLORS[(idx + 1) % BOOKMARK_COLORS.length] };
      try { localStorage.setItem('reader-bookmarks', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const loadReaderCrossRefs = async (bookAbbrev, chapterNumber) => {
    const cacheKey = `${bookAbbrev}/${chapterNumber}`;
    if (_readerCrossRefCacheRef.current[cacheKey]) {
      setReaderCrossRefs(_readerCrossRefCacheRef.current[cacheKey]);
      return;
    }
    setReaderCrossRefsLoading(true);
    try {
      const res = await fetch(`https://bible.helloao.org/api/d/open-cross-ref/${bookAbbrev}/${chapterNumber}.json`);
      if (!res.ok) throw new Error('no cross-refs');
      const data = await res.json();
      const byVerse = {};
      for (const item of data.chapter?.content ?? []) {
        if (item.references?.length) byVerse[item.verse] = item.references;
      }
      _readerCrossRefCacheRef.current[cacheKey] = byVerse;
      setReaderCrossRefs(byVerse);
    } catch {
      setReaderCrossRefs(null);
    } finally {
      setReaderCrossRefsLoading(false);
    }
  };

  const copyVerse = (bookName, chapterNum, verseNum, text) => {
    const citation = `${bookName} ${chapterNum}:${verseNum} BSB — ${text}`;
    navigator.clipboard?.writeText(citation);
  };

  // ---------------------------------------------------------------------------
  // Startup: migrate old keys and load index
  // ---------------------------------------------------------------------------
  useEffect(() => {
    migrateOldStorageKeys();
    const localIndex = loadProjectIndex();
    setProjectIndex(localIndex);

    listRemoteProjects().then((result) => {
      if (!result.ok) return;
      const localMap = new Map(localIndex.map((e) => [e.id, e]));
      const missing = result.data.filter((e) => !localMap.has(e.id));
      if (missing.length > 0) setRemoteOnlyProjects(missing);
      const stale = result.data.filter((e) => {
        const local = localMap.get(e.id);
        return local && (e.lastEdited ?? 0) > (local.lastEdited ?? 0);
      });
      if (stale.length > 0) setStaleLocalProjects(stale);
    });
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
  const selectedChunkChapterIndex = selectedChunk
    ? project.chapters.findIndex((ch) => ch.chunks.some((c) => c.id === selectedChunk.id))
    : -1;

  useEffect(() => {
    if (collapsedSections.commentary) return;
    if (selectedChunkChapterIndex < 0) return;
    const chapter = project.chapters[selectedChunkChapterIndex];
    setCommentaryLoading(true);
    setCommentaryError('');
    loadCommentaryChapter(commentarySource, chapter.bookAbbrev, chapter.chapter)
      .then((data) => setCommentaryData(data))
      .catch((err) => {
        setCommentaryData(null);
        setCommentaryError(err.message);
      })
      .finally(() => setCommentaryLoading(false));
  }, [commentarySource, selectedChunk?.id, selectedChunkChapterIndex, collapsedSections.commentary]);

  useEffect(() => {
    if (collapsedSections.interlinear) return;
    if (selectedChunkChapterIndex < 0) return;
    const chapter = project.chapters[selectedChunkChapterIndex];
    setInterlinearLoading(true);
    setInterlinearError('');
    loadInterlinearChapter(chapter.bookAbbrev, chapter.chapter)
      .then((data) => setInterlinearData(data?.[String(chapter.chapter)] ?? null))
      .catch((err) => {
        setInterlinearData(null);
        setInterlinearError(err.message);
      })
      .finally(() => setInterlinearLoading(false));
  }, [selectedChunk?.id, selectedChunkChapterIndex, collapsedSections.interlinear]);

  useEffect(() => {
    setCrossRefSuggestions([]);
    setTagInput('');
  }, [selectedChunk?.id]);
  const selectedChunkChapter = selectedChunkChapterIndex >= 0
    ? project.chapters[selectedChunkChapterIndex]
    : null;
  const selectedChunkVerses = selectedChunk
    ? getChunkVerseEntries(project, selectedChunkChapterIndex, selectedChunk)
    : [];
  const selectedChunkGlobalIndex = allChunks.findIndex((c) => c.id === project?.selectedChunkId);

  useEffect(() => {
    setCrossRefInput('');
  }, [project?.selectedChunkId]);

  // Keyboard shortcuts: arrow keys navigate chunks on the study page, Esc closes modals
  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = event.target?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable;

      if (event.key === 'Escape') {
        if (suggestModal) {
          setSuggestModal(null);
          setSuggestSelection(new Set());
        }
        return;
      }

      if (currentPage !== 'study' || isEditable || suggestModal) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousChunk();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextChunk();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, suggestModal, selectedChunkGlobalIndex, allChunks]);

  // Autosave
  useEffect(() => {
    if (!project) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      // Stamp lastEdited once so localStorage and server receive the same value
      const toSave = { ...project, lastEdited: Date.now() };

      // 1. Save locally
      saveProjectToStorage(toSave);
      setProjectIndex(loadProjectIndex());
      setSaveStatus('Saved');
      window.setTimeout(() => setSaveStatus(''), 1400);

      // 2. Sync to server with the same timestamped object
      setSyncStatus('syncing');
      const result = await saveRemoteProject(toSave);
      setSyncStatus(result.ok ? 'synced' : 'error');
      // On success clear after 2.5s; on error keep visible until next successful sync
      if (result.ok) window.setTimeout(() => setSyncStatus(''), 2500);
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

  const addChunkToChapter = (chapterIndex, start, end, spilloverEndVerse = null) => {
    updateProject((current) => {
      const chapters = current.chapters.map((ch, idx) => {
        if (idx !== chapterIndex) return ch;
        const overlap = ch.chunks.find(
          (c) => c.startVerse === start
            && c.endVerse === end
            && (c.spilloverEndVerse ?? null) === (spilloverEndVerse ?? null),
        );
        if (overlap) return ch;
        const newChunk = {
          id: makeId(),
          startVerse: start,
          endVerse: end,
          spilloverEndVerse,
          observation: '',
          interpretation: '',
          application: '',
          crossReferences: [],
          greekWords: [],
          generalNotes: '',
          episodeNumber: '',
          episodeTitle: '',
          finalScript: '',
          tags: [],
        };
        return { ...ch, chunks: [...ch.chunks, newChunk] };
      });
      // Find the newly added chunk id
      const newChunk = chapters[chapterIndex].chunks.at(-1);
      return { ...current, chapters, selectedChunkId: newChunk?.id ?? current.selectedChunkId };
    });
  };

  const addChunk = (start, end, spilloverEndVerse = null) => {
    if (!project) return;
    const chapter = activeChapter;
    if (!chapter) return;
    const overlap = chapter.chunks.find(
      (c) => c.startVerse === start
        && c.endVerse === end
        && (c.spilloverEndVerse ?? null) === (spilloverEndVerse ?? null),
    );
    if (overlap) {
      setStatusMessage('That chunk already exists.');
      window.setTimeout(() => setStatusMessage(''), 1800);
      return;
    }
    addChunkToChapter(activeChapterIndex, start, end, spilloverEndVerse);
  };

  const addChunkRanges = (ranges) => {
    if (!project || !activeChapter || ranges.length === 0) {
      return { addedCount: 0, skippedCount: 0 };
    }

    let addedCount = 0;
    let skippedCount = 0;
    let lastAddedChunkId = null;

    updateProject((current) => {
      const chapters = current.chapters.map((ch, idx) => {
        if (idx !== activeChapterIndex) return ch;
        const existing = new Set(
          ch.chunks.map((c) => `${c.startVerse}-${c.endVerse}-${c.spilloverEndVerse ?? ''}`),
        );
        const newChunks = [];

        ranges.forEach(({ start, end, spilloverEndVerse = null }) => {
          const key = `${start}-${end}-${spilloverEndVerse ?? ''}`;
          if (existing.has(key)) {
            skippedCount += 1;
            return;
          }
          const newChunk = {
            id: makeId(),
            startVerse: start,
            endVerse: end,
            spilloverEndVerse,
            observation: '',
            interpretation: '',
            application: '',
            crossReferences: [],
            greekWords: [],
            tags: [],
          };
          existing.add(key);
          newChunks.push(newChunk);
          addedCount += 1;
          lastAddedChunkId = newChunk.id;
        });

        return newChunks.length > 0
          ? { ...ch, chunks: [...ch.chunks, ...newChunks] }
          : ch;
      });

      return {
        ...current,
        chapters,
        selectedChunkId: lastAddedChunkId ?? current.selectedChunkId,
      };
    });

    return { addedCount, skippedCount };
  };

  const addTypedChunk = () => {
    if (!activeChapter) return;
    const start = Number.parseInt(typedChunkStart, 10);
    const end = Number.parseInt(typedChunkEnd, 10);
    const nextEndRaw = typedChunkNextEnd.trim();
    const nextEnd = nextEndRaw ? Number.parseInt(nextEndRaw, 10) : null;
    const maxVerse = activeChapter.verses.at(-1)?.number ?? 0;
    const nextChapter = project?.chapters?.[activeChapterIndex + 1] ?? null;
    const nextMaxVerse = nextChapter?.verses?.at(-1)?.number ?? 0;

    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      setStatusMessage('Type a valid start and end verse.');
      window.setTimeout(() => setStatusMessage(''), 2200);
      return;
    }
    if (start < 1 || end < 1 || start > maxVerse || end > maxVerse) {
      setStatusMessage(`Verse range must be between 1 and ${maxVerse}.`);
      window.setTimeout(() => setStatusMessage(''), 2200);
      return;
    }
    if (start > end) {
      setStatusMessage('Start verse must be less than or equal to end verse.');
      window.setTimeout(() => setStatusMessage(''), 2200);
      return;
    }

    if (nextEndRaw) {
      if (!nextChapter) {
        setStatusMessage('Add the next chapter first to span chunks across chapters.');
        window.setTimeout(() => setStatusMessage(''), 2400);
        return;
      }
      if (nextChapter.bookAbbrev !== activeChapter.bookAbbrev) {
        setStatusMessage('Chapter spanning only works into the next chapter of the same book.');
        window.setTimeout(() => setStatusMessage(''), 2400);
        return;
      }
      if (!Number.isInteger(nextEnd) || nextEnd < 1 || nextEnd > nextMaxVerse) {
        setStatusMessage(`Next chapter end must be between 1 and ${nextMaxVerse}.`);
        window.setTimeout(() => setStatusMessage(''), 2400);
        return;
      }
      if (end !== maxVerse) {
        setStatusMessage('To span chapters, set End to the last verse of this chapter.');
        window.setTimeout(() => setStatusMessage(''), 2400);
        return;
      }
    }

    const { addedCount } = addChunkRanges([{ start, end, spilloverEndVerse: nextEnd }]);
    if (addedCount === 0) {
      setStatusMessage('That chunk already exists.');
      window.setTimeout(() => setStatusMessage(''), 2200);
      return;
    }

    setTypedChunkStart('');
    setTypedChunkEnd('');
    setTypedChunkNextEnd('');
  };

  const addBulkTypedChunks = () => {
    if (!activeChapter) return;
    const raw = typedChunkBulk.trim();
    if (!raw) {
      setStatusMessage('Type chunk ranges first. Example: 1-6, 7-12');
      window.setTimeout(() => setStatusMessage(''), 2200);
      return;
    }

    const maxVerse = activeChapter.verses.at(-1)?.number ?? 0;
    const nextChapter = project?.chapters?.[activeChapterIndex + 1] ?? null;
    const nextMaxVerse = nextChapter?.verses?.at(-1)?.number ?? 0;
    const parts = raw
      .split(/[\n,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const validRanges = [];
    let invalidCount = 0;

    parts.forEach((part) => {
      const single = /^(\d+)$/.exec(part);
      if (single) {
        const v = Number.parseInt(single[1], 10);
        if (v >= 1 && v <= maxVerse) {
          validRanges.push({ start: v, end: v });
        } else {
          invalidCount += 1;
        }
        return;
      }

      const range = /^(\d+)\s*-\s*(\d+)(?:\s*:\s*(\d+))?$/.exec(part);
      if (!range) {
        invalidCount += 1;
        return;
      }

      const start = Number.parseInt(range[1], 10);
      const end = Number.parseInt(range[2], 10);
      const spilloverEndVerse = range[3] ? Number.parseInt(range[3], 10) : null;
      if (start < 1 || end < 1 || start > end || start > maxVerse || end > maxVerse) {
        invalidCount += 1;
        return;
      }
      if (spilloverEndVerse !== null) {
        if (!nextChapter
          || nextChapter.bookAbbrev !== activeChapter.bookAbbrev
          || spilloverEndVerse < 1
          || spilloverEndVerse > nextMaxVerse
          || end !== maxVerse) {
          invalidCount += 1;
          return;
        }
      }
      validRanges.push({ start, end, spilloverEndVerse });
    });

    if (validRanges.length === 0) {
      setStatusMessage(`No valid ranges found. Use 1-${maxVerse} and format like 1-6, 7-12.`);
      window.setTimeout(() => setStatusMessage(''), 2600);
      return;
    }

    const { addedCount, skippedCount } = addChunkRanges(validRanges);
    const notes = [];
    if (addedCount > 0) notes.push(`Added ${addedCount} chunk${addedCount > 1 ? 's' : ''}`);
    if (skippedCount > 0) notes.push(`skipped ${skippedCount} duplicate${skippedCount > 1 ? 's' : ''}`);
    if (invalidCount > 0) notes.push(`ignored ${invalidCount} invalid`);
    setStatusMessage(notes.join(' • '));
    window.setTimeout(() => setStatusMessage(''), 2800);

    if (addedCount > 0) {
      setTypedChunkBulk('');
    }
  };

  const addClickSpanChunk = () => {
    if (!activeChapter || rangeStart === null) {
      setStatusMessage('Click a start verse first, then set next chapter end.');
      window.setTimeout(() => setStatusMessage(''), 2400);
      return;
    }

    const nextChapter = project?.chapters?.[activeChapterIndex + 1] ?? null;
    if (!nextChapter) {
      setStatusMessage('Add the next chapter first to span into it.');
      window.setTimeout(() => setStatusMessage(''), 2400);
      return;
    }
    if (nextChapter.bookAbbrev !== activeChapter.bookAbbrev) {
      setStatusMessage('Click-based spanning only works into the next chapter of the same book.');
      window.setTimeout(() => setStatusMessage(''), 2600);
      return;
    }

    const nextMaxVerse = nextChapter.verses.at(-1)?.number ?? 0;
    const spilloverEndVerse = Number.parseInt(clickedSpanNextEnd, 10);
    if (!Number.isInteger(spilloverEndVerse) || spilloverEndVerse < 1 || spilloverEndVerse > nextMaxVerse) {
      setStatusMessage(`Next chapter end must be between 1 and ${nextMaxVerse}.`);
      window.setTimeout(() => setStatusMessage(''), 2400);
      return;
    }

    const start = rangeStart;
    const end = activeChapter.verses.at(-1)?.number ?? start;
    const { addedCount } = addChunkRanges([{ start, end, spilloverEndVerse }]);
    if (addedCount === 0) {
      setStatusMessage('That cross-chapter chunk already exists.');
      window.setTimeout(() => setStatusMessage(''), 2400);
      return;
    }

    setClickedSpanNextEnd('');
    setRangeStart(null);
    setRangeEnd(null);
    setStatusMessage('Cross-chapter chunk added.');
    window.setTimeout(() => setStatusMessage(''), 1800);
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

  const [tagInput, setTagInput] = useState('');

  const addTag = (chunkId) => {
    const tag = tagInput.trim();
    if (!tag) return;
    const existing = selectedChunk?.tags ?? [];
    if (existing.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagInput('');
      return;
    }
    updateChunk(chunkId, { tags: [...existing, tag] });
    setTagInput('');
  };

  const removeTag = (chunkId, tag) => {
    updateChunk(chunkId, {
      tags: (selectedChunk?.tags ?? []).filter((t) => t !== tag),
    });
  };

  const importFinalScriptDocx = async (chunkId, file) => {
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value } = await mammoth.extractRawText({ arrayBuffer });
      updateChunk(chunkId, { finalScript: value.trim() });
      setStatusMessage('Imported script from DOCX.');
      window.setTimeout(() => setStatusMessage(''), 1800);
    } catch (err) {
      setStatusMessage('Could not read that DOCX file.');
      window.setTimeout(() => setStatusMessage(''), 1800);
    }
  };

  const [suggestingCrossRefs, setSuggestingCrossRefs] = useState(false);
  const [crossRefSuggestions, setCrossRefSuggestions] = useState([]);
  const _crossRefDatasetCacheRef = useRef({});

  const formatCrossRef = (ref) => {
    const book = bookOptions.find((b) => b.abbrev === ref.book);
    const bookName = book?.name ?? ref.book;
    const verseRange = ref.endVerse && ref.endVerse !== ref.verse
      ? `${ref.verse}-${ref.endVerse}`
      : `${ref.verse}`;
    return `${bookName} ${ref.chapter}:${verseRange}`;
  };

  const suggestCrossRefsForChunk = async (chunkId) => {
    const chunk = allChunks.find((c) => c.id === chunkId);
    const chapterIndex = project?.chapters.findIndex((ch) =>
      ch.chunks.some((c) => c.id === chunkId)
    ) ?? -1;
    const chapter = chapterIndex >= 0 ? project.chapters[chapterIndex] : null;
    if (!chunk || !chapter) return;

    setSuggestingCrossRefs(true);
    setCrossRefSuggestions([]);
    try {
      const cacheKey = `${chapter.bookAbbrev}/${chapter.chapter}`;
      let chapterData = _crossRefDatasetCacheRef.current[cacheKey];
      if (!chapterData) {
        const res = await fetch(`https://bible.helloao.org/api/d/open-cross-ref/${chapter.bookAbbrev}/${chapter.chapter}.json`);
        if (!res.ok) throw new Error('No cross-reference data found for this chapter.');
        chapterData = await res.json();
        _crossRefDatasetCacheRef.current[cacheKey] = chapterData;
      }

      const verseEntries = (chapterData.chapter?.content ?? []).filter(
        (item) => item.verse >= chunk.startVerse
          && item.verse <= chunk.endVerse,
      );

      const existing = new Set(chunk.crossReferences ?? []);
      const seen = new Set();
      const refs = [];
      for (const v of verseEntries) {
        for (const ref of v.references ?? []) {
          const formatted = formatCrossRef(ref);
          if (existing.has(formatted) || seen.has(formatted)) continue;
          seen.add(formatted);
          refs.push({ formatted, score: ref.score ?? 0 });
        }
      }

      refs.sort((a, b) => b.score - a.score);
      if (refs.length === 0) {
        setStatusMessage('No new cross-reference suggestions found for this passage.');
        window.setTimeout(() => setStatusMessage(''), 2500);
        return;
      }
      setCrossRefSuggestions(refs.slice(0, 12).map((r) => r.formatted));
    } catch (err) {
      setStatusMessage(`Cross-reference suggest failed: ${err.message}`);
      window.setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setSuggestingCrossRefs(false);
    }
  };

  const _verseChapterCacheRef = useRef({});

  const loadVerseText = async (refString) => {
    const parsed = parseCrossRefString(refString);
    if (!parsed) throw new Error('Could not parse reference.');
    const translation = project?.translation ?? 'BSB';
    const cacheKey = `${translation}/${parsed.bookAbbrev}/${parsed.chapter}`;
    let verses = _verseChapterCacheRef.current[cacheKey];
    if (!verses) {
      const res = await fetch(`https://bible.helloao.org/api/${translation}/${parsed.bookAbbrev}/${parsed.chapter}.json`);
      if (!res.ok) throw new Error('Could not load verse text.');
      const data = await res.json();
      verses = parseBibleChapter(data);
      _verseChapterCacheRef.current[cacheKey] = verses;
    }
    const text = verses
      .filter((v) => v.number >= parsed.verse && v.number <= parsed.endVerse)
      .map((v) => v.text)
      .join(' ');
    return text;
  };

  const addSuggestedCrossRef = (chunkId, ref) => {
    updateChunk(chunkId, {
      crossReferences: [...(selectedChunk?.crossReferences ?? []), ref],
    });
    setCrossRefSuggestions((cur) => cur.filter((r) => r !== ref));
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
      englishGloss: '',
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

  // Cache for the NT Strong's concordance (verse → Strong's numbers), loaded once
  const _concordanceRef = useRef(null);
  const _concordanceLoadingRef = useRef(null);

  // Cache for the NT Strong's→English gloss map (from macula-greek dataset), loaded once
  const _glossRef = useRef(null);
  const _glossLoadingRef = useRef(null);
  // Cache for the Hebrew Strong's dictionary (loaded once)
  const _hebrewDictRef = useRef(null);
  const _hebrewDictLoadingRef = useRef(null);

  const loadNtGloss = async () => {
    if (_glossRef.current) return _glossRef.current;
    if (_glossLoadingRef.current) return _glossLoadingRef.current;
    _glossLoadingRef.current = fetch('/nt-strongs-gloss.json')
      .then((res) => res.json())
      .then((data) => {
        _glossRef.current = data;
        _glossLoadingRef.current = null;
        return data;
      });
    return _glossLoadingRef.current;
  };

  const loadNtConcordance = async () => {
    if (_concordanceRef.current) return _concordanceRef.current;
    if (_concordanceLoadingRef.current) return _concordanceLoadingRef.current;
    _concordanceLoadingRef.current = fetch('/nt-strongs-concordance.json')
      .then((res) => res.json())
      .then((data) => {
        _concordanceRef.current = data;
        _concordanceLoadingRef.current = null;
        return data;
      });
    return _concordanceLoadingRef.current;
  };

  const loadHebrewDict = async () => {
    if (_hebrewDictRef.current) return _hebrewDictRef.current;
    if (_hebrewDictLoadingRef.current) return _hebrewDictLoadingRef.current;
    _hebrewDictLoadingRef.current = fetch(
      'https://cdn.jsdelivr.net/gh/openscriptures/strongs@master/hebrew/strongs-hebrew-dictionary.js',
    )
      .then((res) => res.text())
      .then((text) => {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        const dict = JSON.parse(text.slice(start, end));
        _hebrewDictRef.current = dict;
        _hebrewDictLoadingRef.current = null;
        return dict;
      });
    return _hebrewDictLoadingRef.current;
  };

  // Common Greek NT function words to pre-uncheck in the picker
  // (articles, prepositions, conjunctions, particles, common pronouns)
  const GREEK_FUNCTION_WORDS = new Set([
    'G3588','G3739','G3748', // ὁ (the), ὅς (who/which), ὅστις
    'G2532','G1161','G1063','G235','G3767','G2443','G5037','G3303', // καί, δέ, γάρ, ἀλλά, οὖν, ἵνα, τέ, μέν
    'G1487','G1437','G3754','G5613','G2531','G5618', // εἰ, ἐάν, ὅτι, ὡς, καθώς, ὥσπερ
    'G1722','G1519','G1537','G575','G4314','G3326','G2596','G1223', // ἐν, εἰς, ἐκ, ἀπό, πρός, μετά, κατά, διά
    'G1909','G5228','G5259','G4862','G3844','G4253','G4012','G1722', // ἐπί, ὑπέρ, ὑπό, σύν, παρά, πρό, περί
    'G3756','G3361','G3780','G3762','G3763', // οὐ, μή, οὐχί, οὐδείς, οὐδέποτε
    'G846','G1473','G4771','G2249','G5210', // αὐτός, ἐγώ, σύ, ἡμεῖς, ὑμεῖς
    'G3778','G1565','G3588', // οὗτος, ἐκεῖνος
    'G5100','G5101','G3956','G3745','G3748', // τις, τίς, πᾶς, ὅσος
    'G3779','G3568','G5119','G1161','G3767', // οὕτως, νῦν, τότε
  ]);

  const suggestGreekWordsForChunk = async (chunkId) => {
    const chunk = allChunks.find((c) => c.id === chunkId);
    const chapterIndex = project?.chapters.findIndex((ch) =>
      ch.chunks.some((c) => c.id === chunkId)
    ) ?? -1;
    const chapter = chapterIndex >= 0 ? project.chapters[chapterIndex] : null;
    if (!chunk || !chapter) return;
    if (!NT_BOOK_NUMBER[chapter.bookAbbrev]) {
      setStatusMessage('Auto-suggest only works for New Testament books.');
      window.setTimeout(() => setStatusMessage(''), 2500);
      return;
    }
    setSuggestingGreekForChunkId(chunkId);
    try {
      const [concordance, dict, gloss] = await Promise.all([loadNtConcordance(), loadGreekDict(), loadNtGloss()]);
      const bookData = concordance[chapter.bookAbbrev] ?? {};
      const chapterData = bookData[chapter.chapter] ?? {};
      const nextChapterData = chunkSpansNextChapter(project, chapterIndex, chunk)
        ? bookData[project.chapters[chapterIndex + 1].chapter] ?? {}
        : {};

      const strongsInRange = new Set();
      for (let v = chunk.startVerse; v <= chunk.endVerse; v++) {
        for (const s of chapterData[String(v)] ?? []) strongsInRange.add(s);
      }
      if (chunkSpansNextChapter(project, chapterIndex, chunk)) {
        for (let v = 1; v <= chunk.spilloverEndVerse; v++) {
          for (const s of nextChapterData[String(v)] ?? []) strongsInRange.add(s);
        }
      }

      if (strongsInRange.size === 0) {
        setStatusMessage("No Strong's data found for this passage.");
        window.setTimeout(() => setStatusMessage(''), 3000);
        return;
      }

      const existingNumbers = new Set(
        chunk.greekWords.map((w) => w.strongNumber.toUpperCase()).filter(Boolean)
      );

      const modalWords = [];
      for (const strongKey of strongsInRange) {
        if (existingNumbers.has(strongKey)) continue;
        const entry = dict[strongKey];
        modalWords.push({
          strongKey,
          lexeme: entry?.lemma ?? '',
          translit: entry?.translit ?? '',
          def: gloss[strongKey] ?? entry?.kjv_def ?? 'No definition found.',
          entry,
        });
      }

      if (modalWords.length === 0) {
        setStatusMessage('All words from this passage are already added.');
        window.setTimeout(() => setStatusMessage(''), 2000);
        return;
      }

      // Pre-select content words; pre-uncheck known function words
      const preSelected = new Set(
        modalWords
          .filter((w) => !GREEK_FUNCTION_WORDS.has(w.strongKey))
          .map((w) => w.strongKey)
      );
      setSuggestModal({
        chunkId,
        language: 'greek',
        helperText: "Content words are pre-checked. Uncheck any you don't need.",
        words: modalWords,
      });
      setSuggestSelection(preSelected);
    } catch (err) {
      setStatusMessage(`Suggest failed: ${err.message}`);
      window.setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setSuggestingGreekForChunkId(null);
    }
  };

  // Extract a single short English gloss from a verbose kjv_def string.
  // e.g. "[idiom] burn (incense), be mindful..." → "burn"
  //      "another, [idiom] (blood-) thirsty..." → "another"
  const shortHebrewGloss = (kjvDef) => {
    if (!kjvDef) return '';
    let s = kjvDef.trim();
    // strip leading [tag] tokens like [idiom], [phrase]
    s = s.replace(/^(\[[^\]]+\]\s*)+/, '').trim();
    // take first chunk before comma, semicolon, or opening paren
    s = s.split(/[,;(]/)[0].trim();
    // strip trailing punctuation
    s = s.replace(/[.\-]+$/, '').trim();
    return s;
  };

  const ENGLISH_STOP_WORDS = new Set([
    'the', 'and', 'for', 'that', 'with', 'this', 'from', 'were', 'was', 'have', 'has',
    'had', 'are', 'but', 'not', 'you', 'your', 'his', 'her', 'their', 'they', 'them',
    'our', 'out', 'into', 'over', 'under', 'upon', 'then', 'than', 'who', 'what', 'when',
    'where', 'why', 'how', 'also', 'there', 'here', 'all', 'any', 'one', 'two', 'three',
    'he', 'she', 'it', 'we', 'i', 'me', 'my', 'mine', 'ours', 'theirs', 'its',
  ]);

  const suggestHebrewWordsForChunk = async (chunkId) => {
    const chunk = allChunks.find((c) => c.id === chunkId);
    const chapterIndex = project?.chapters.findIndex((ch) =>
      ch.chunks.some((c) => c.id === chunkId)
    ) ?? -1;
    const chapter = chapterIndex >= 0 ? project.chapters[chapterIndex] : null;
    if (!chunk || !chapter) return;
    if (NT_BOOK_NUMBER[chapter.bookAbbrev]) {
      setStatusMessage('Hebrew suggestions are for Old Testament passages.');
      window.setTimeout(() => setStatusMessage(''), 2500);
      return;
    }

    setSuggestingHebrewForChunkId(chunkId);
    try {
      const dict = await loadHebrewDict();
      const versesInChunk = getChunkVerseEntries(project, chapterIndex, chunk)
        .map((v) => v.text)
        .join(' ')
        .toLowerCase();

      const candidateWords = Array.from(new Set(
        versesInChunk
          .replace(/[^a-z\s]/g, ' ')
          .split(/\s+/)
          .map((w) => w.trim())
          .filter((w) => w.length >= 4 && !ENGLISH_STOP_WORDS.has(w)),
      ));

      if (candidateWords.length === 0) {
        setStatusMessage('No Hebrew suggestion candidates found in this passage.');
        window.setTimeout(() => setStatusMessage(''), 2500);
        return;
      }

      const existingNumbers = new Set(
        chunk.greekWords.map((w) => (w.strongNumber || '').toUpperCase()).filter(Boolean)
      );

      const seen = new Set();
      const modalWords = [];
      const entries = Object.entries(dict);

      for (const token of candidateWords) {
        const match = entries.find(([, entry]) => {
          const defs = `${entry.kjv_def || ''} ${entry.strongs_def || ''}`.toLowerCase();
          return defs.split(/[,;()\s]+/).includes(token);
        });
        if (!match) continue;
        const [strongKey, entry] = match;
        if (!/^H\d+$/i.test(strongKey)) continue;
        const normalized = strongKey.toUpperCase();
        if (existingNumbers.has(normalized) || seen.has(normalized)) continue;
        seen.add(normalized);
        modalWords.push({
          strongKey: normalized,
          lexeme: entry?.lemma ?? '',
          translit: entry?.xlit ?? '',
          def: shortHebrewGloss(entry?.kjv_def) || 'No definition found.',
          fullDef: entry?.kjv_def ?? '',
          entry,
        });
        if (modalWords.length >= 20) break;
      }

      if (modalWords.length === 0) {
        setStatusMessage('No Hebrew suggestions found from this passage text.');
        window.setTimeout(() => setStatusMessage(''), 2500);
        return;
      }

      setSuggestModal({
        chunkId,
        language: 'hebrew',
        helperText: 'Heuristic matches from passage text; uncheck anything not useful.',
        words: modalWords,
      });
      setSuggestSelection(new Set(modalWords.map((w) => w.strongKey)));
    } catch (err) {
      setStatusMessage(`Hebrew suggest failed: ${err.message}`);
      window.setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setSuggestingHebrewForChunkId(null);
    }
  };

  const confirmSuggestWords = () => {
    if (!suggestModal) return;
    const { chunkId, words } = suggestModal;
    const newWords = words
      .filter((w) => suggestSelection.has(w.strongKey))
      .map((w) => ({
        id: makeId(),
        query: w.strongKey,
        strongNumber: w.strongKey,
        englishGloss: w.def,
        lexeme: w.lexeme,
        transliteration: w.translit,
        partOfSpeech: '',
        shortDefinition: w.fullDef || w.def,
        definitionHtml: w.entry ? buildGreekDefinitionHtml(w.strongKey, w.entry) : '',
        loading: false,
      }));
    if (newWords.length > 0) {
      updateProject((current) => ({
        ...current,
        chapters: current.chapters.map((ch) => ({
          ...ch,
          chunks: ch.chunks.map((c) =>
            c.id === chunkId ? { ...c, greekWords: [...c.greekWords, ...newWords] } : c
          ),
        })),
      }));
      const label = suggestModal?.language === 'hebrew' ? 'Hebrew' : 'Greek';
      setStatusMessage(`Added ${newWords.length} ${label} word${newWords.length > 1 ? 's' : ''}.`);
      window.setTimeout(() => setStatusMessage(''), 2000);
    }
    setSuggestModal(null);
    setSuggestSelection(new Set());
  };

  const isGreekStrongNumber = (query) => /^G\d+$/i.test(query.trim());
  const isHebrewStrongNumber = (query) => /^H\d+$/i.test(query.trim());

  const externalLookupLinks = (query) => {
    const raw = query.trim();
    const normalized = raw.toUpperCase();
    const isGreek = /^G\d+$/.test(normalized);
    const isHebrew = /^H\d+$/.test(normalized);
    const num = (isGreek || isHebrew) ? normalized.slice(1) : null;
    if (isGreek && num) {
      return [
        { label: 'BibleHub', url: `https://biblehub.com/greek/${num}.htm` },
        { label: 'Blue Letter Bible', url: `https://www.blueletterbible.org/lexicon/g${num}/esv/0-1/` },
        { label: 'StudyLight', url: `https://www.studylight.org/lexicons/eng/greek/${num}.html` },
      ];
    }
    if (isHebrew && num) {
      return [
        { label: 'BibleHub', url: `https://biblehub.com/hebrew/${num}.htm` },
        { label: 'Blue Letter Bible', url: `https://www.blueletterbible.org/lexicon/h${num}/kjv/wlc/0-1/` },
        { label: 'StudyLight', url: `https://www.studylight.org/lexicons/eng/hebrew/${num}.html` },
      ];
    }
    const enc = encodeURIComponent(raw);
    return [
      { label: 'BibleHub', url: `https://biblehub.com/search.php?q=${enc}` },
      { label: 'Blue Letter Bible', url: `https://www.blueletterbible.org/search/search.cfm?Criteria=${enc}&t=KJV#s=s_lexiconc` },
    ];
  };

  // Module-level cache for the Greek Strong's dictionary (loaded once, ~1.2 MB)
  const _greekDictRef = useRef(null);
  const _greekDictLoadingRef = useRef(null);

  const loadGreekDict = async () => {
    if (_greekDictRef.current) return _greekDictRef.current;
    if (_greekDictLoadingRef.current) return _greekDictLoadingRef.current;
    _greekDictLoadingRef.current = fetch(
      'https://cdn.jsdelivr.net/gh/openscriptures/strongs@master/greek/strongs-greek-dictionary.js',
    )
      .then((res) => res.text())
      .then((text) => {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        const dict = JSON.parse(text.slice(start, end));
        _greekDictRef.current = dict;
        _greekDictLoadingRef.current = null;
        return dict;
      });
    return _greekDictLoadingRef.current;
  };

  const buildGreekDefinitionHtml = (key, entry) => {
    let html = '';
    if (entry.strongs_def) html += `<p>${entry.strongs_def.trim()}</p>`;
    if (entry.derivation) html += `<p><em>Derivation:</em> ${entry.derivation}</p>`;
    if (entry.kjv_def) html += `<p><em>KJV uses:</em> ${entry.kjv_def}</p>`;
    return html;
  };

  const fetchBollsDefinition = async (query) => {
    const encoded = encodeURIComponent(query.trim());

    if (isHebrewStrongNumber(query)) {
      const response = await fetch(`https://bolls.life/dictionary-definition/BDBT/${encoded}/`);
      if (!response.ok) return null;
      let defs;
      try { defs = await response.json(); } catch { return null; }
      return Array.isArray(defs) && defs.length > 0 ? defs : null;
    }

    // Greek — look up in the cached OpenScriptures Strong's dictionary.
    const dict = await loadGreekDict();
    const key = isGreekStrongNumber(query) ? query.trim().toUpperCase() : null;

    if (key) {
      const entry = dict[key];
      if (!entry) return null;
      return [{
        topic: key,
        lexeme: entry.lemma || '',
        transliteration: entry.translit || '',
        short_definition: entry.kjv_def || '',
        definition: buildGreekDefinitionHtml(key, entry),
      }];
    }

    // English word search — scan kjv_def and strongs_def for the query term.
    const lowerQ = query.trim().toLowerCase();
    const match = Object.entries(dict).find(([, entry]) =>
      (entry.kjv_def || '').toLowerCase().split(/[,\s]+/).some((w) => w === lowerQ) ||
      (entry.strongs_def || '').toLowerCase().includes(lowerQ),
    );
    if (match) {
      const [matchKey, entry] = match;
      return [{
        topic: matchKey,
        lexeme: entry.lemma || '',
        transliteration: entry.translit || '',
        short_definition: entry.kjv_def || '',
        definition: buildGreekDefinitionHtml(matchKey, entry),
      }];
    }

    return null;
  };

  const lookupWord = async (chunkId, wordId, language = 'greek') => {
    const chunk = allChunks.find((c) => c.id === chunkId);
    const word = chunk?.greekWords.find((w) => w.id === wordId);
    if (!word || !word.query.trim()) return;
    updateChunkWord(chunkId, wordId, { loading: true });
    try {
      // Normalize bare numbers based on selected lookup language.
      const raw = word.query.trim();
      const inferredPrefix = language === 'hebrew' ? 'H' : 'G';
      const normalized = /^\d+$/.test(raw)
        ? `${inferredPrefix}${raw}`
        : /^[gGhH]\d+$/.test(raw)
          ? raw.toUpperCase()
          : raw;

      const [definitions, gloss] = await Promise.all([
        fetchBollsDefinition(normalized),
        loadNtGloss().catch(() => ({})),
      ]);
      if (!definitions || definitions.length === 0) {
        updateChunkWord(chunkId, wordId, {
          strongNumber: '',
          shortDefinition: 'No definition found.',
          definitionHtml: '',
        });
        return;
      }
      const first = definitions[0];
      const strongKey = (first.topic || normalized).toUpperCase();
      const extractedPartOfSpeech = extractPartOfSpeech(first.definition || '');
      updateChunkWord(chunkId, wordId, {
        strongNumber: first.topic || normalized,
        englishGloss: gloss[strongKey] || first.short_definition || '',
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
        children: [
          new TextRun({
            text: `${project.translation} — ${buildChapterSummary(project)}`,
            italics: true,
            color: '7A7060',
          }),
        ],
        spacing: { after: 300 },
      }),
    ];

    const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

    project.chapters.forEach((ch, chapterIndex) => {
      children.push(new Paragraph({
        text: `${ch.book} ${ch.chapter}`,
        heading: HeadingLevel.HEADING_1,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: DOCX_ACCENT, space: 4 } },
        spacing: { before: 360, after: 160 },
      }));
      ch.chunks.forEach((chunk) => {
        const scriptureHeading = formatChunkReference(project, chapterIndex, chunk, '-');

        const headingRuns = [new TextRun({ text: scriptureHeading, bold: true, size: 28, color: DOCX_ACCENT, font: DOCX_HEADING_FONT })];
        if (chunk.episodeNumber || chunk.episodeTitle) {
          headingRuns.push(new TextRun({
            text: `   (Ep. ${chunk.episodeNumber || '—'}${chunk.episodeTitle ? `: ${chunk.episodeTitle}` : ''})`,
            italics: true,
            size: 22,
            color: '7A7060',
          }));
        }
        children.push(new Paragraph({ children: headingRuns, spacing: { before: 320, after: 120 } }));

        // Scripture text in a left-bordered table cell for a "callout" look (no fill)
        const scriptureParas = getChunkVerseEntries(project, chapterIndex, chunk).map((verse) => new Paragraph({
          children: [
            new TextRun({ text: `${verse.chapter}:${verse.number} `, bold: true, color: DOCX_ACCENT }),
            new TextRun({ text: verse.text, italics: true }),
          ],
          spacing: { after: 80 },
        }));
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  margins: { top: 120, bottom: 120, left: 180, right: 180 },
                  borders: {
                    ...{ top: noBorder, right: noBorder, bottom: noBorder },
                    left: { style: BorderStyle.SINGLE, size: 24, color: DOCX_ACCENT },
                  },
                  children: scriptureParas,
                }),
              ],
            }),
          ],
        }));
        children.push(new Paragraph({ text: '', spacing: { after: 120 } }));

        if (chunk.generalNotes?.trim()) {
          children.push(sectionLabel('Background / General Notes'));
          children.push(...createParagraphsFromText(chunk.generalNotes));
        }

        children.push(sectionLabel('Observation'));
        children.push(...createParagraphsFromText(chunk.observation || 'No observation.'));
        children.push(sectionLabel('Interpretation'));
        children.push(...createParagraphsFromText(chunk.interpretation || 'No interpretation.'));
        children.push(sectionLabel('Application'));
        children.push(...createParagraphsFromText(chunk.application || 'No application.'));

        if ((chunk.tags ?? []).length > 0) {
          children.push(sectionLabel('Tags'));
          children.push(new Paragraph({
            children: chunk.tags.map((tag, i) => new TextRun({
              text: i === 0 ? `#${tag}` : `   #${tag}`,
              bold: true,
              color: DOCX_ACCENT,
            })),
          }));
        }

        if ((chunk.crossReferences ?? []).length > 0) {
          children.push(sectionLabel('Cross-References'));
          children.push(new Paragraph({ text: chunk.crossReferences.join('  •  ') }));
        }

        if (chunk.greekWords.length > 0) {
          children.push(sectionLabel('Word Studies'));
          const headerCellStyle = (label) => new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: { bottom: { style: BorderStyle.SINGLE, size: 8, color: DOCX_ACCENT } },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: DOCX_ACCENT })] })],
          });
          const tableRows = [
            new TableRow({
              tableHeader: true,
              children: ['Strong', 'Greek', 'Transliteration', 'Part of Speech', 'Short Definition'].map(headerCellStyle),
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
              children.push(new Paragraph({
                spacing: { before: 180, after: 80 },
                children: [new TextRun({ text: `${word.strongNumber} — ${word.lexeme || ''}`, bold: true, color: DOCX_ACCENT })],
              }));
              children.push(...createParagraphsFromText(htmlToPlainText(word.definitionHtml)));
            }
          });
        }

        if (chunk.finalScript?.trim()) {
          children.push(sectionLabel('Final Script'));
          children.push(...createParagraphsFromText(chunk.finalScript));
        }

        children.push(new Paragraph({
          text: '',
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '2A2518', space: 8 } },
        }));
      });
    });

    const doc = new Document({
      styles: {
        default: {
          document: { run: { font: DOCX_BODY_FONT, color: '0A0A08' } },
        },
        paragraphStyles: [
          {
            id: 'Title',
            name: 'Title',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: DOCX_HEADING_FONT, size: 56, bold: true, color: '0A0A08' },
          },
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: DOCX_HEADING_FONT, size: 36, bold: true, color: '0A0A08' },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            run: { font: DOCX_HEADING_FONT, size: 30, bold: true, color: '0A0A08' },
          },
        ],
      },
      sections: [{ children }],
    });
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

  const copyForPodcast = () => {
    if (!project) return;
    const prompt = buildPodcastPrompt(project);
    navigator.clipboard.writeText(prompt).then(() => {
      setSaveStatus('Copied podcast prep!');
      window.setTimeout(() => setSaveStatus(''), 2000);
    });
  };

  const copyPronunciationGuide = () => {
    if (!project) return;
    const guide = buildPronunciationGuide(project);
    navigator.clipboard.writeText(guide).then(() => {
      setSaveStatus('Copied pronunciation guide!');
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
    const loadedChunks = loaded.chapters.flatMap((ch) => ch.chunks);
    const hasSelectedChunk = loaded.selectedChunkId
      && loadedChunks.some((c) => c.id === loaded.selectedChunkId);
    setCurrentPage(hasSelectedChunk ? 'study' : 'setup');
  };

  const renameProjectInStorage = (id, title) => {
    const loaded = loadProjectById(id);
    if (!loaded) return;
    const updated = { ...loaded, title, lastEdited: Date.now() };
    saveProjectToStorage(updated);
    setProjectIndex(loadProjectIndex());
    saveRemoteProject(updated);
    if (project?.id === id) {
      setProject((current) => (current ? { ...current, title } : current));
    }
  };

const deleteProject = (id) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    deleteProjectFromStorage(id);
    setProjectIndex(loadProjectIndex());
    deleteRemoteProject(id); // fire-and-forget
  };

const restoreRemoteProject = async (id) => {
   const result = await loadRemoteProject(id);
   if (!result.ok) {
     alert('Could not restore project from server.');
     return;
   }
   saveProjectToStorage(result.data);
   setProjectIndex(loadProjectIndex());
   setRemoteOnlyProjects((prev) => prev.filter((e) => e.id !== id));
 };

  const pullLatestFromServer = async (id) => {
    const result = await loadRemoteProject(id);
    if (!result.ok) {
      alert('Could not pull latest version from server.');
      return;
    }
    saveProjectToStorage(result.data);
    setProjectIndex(loadProjectIndex());
    setStaleLocalProjects((prev) => prev.filter((e) => e.id !== id));
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

  // ---------------------------------------------------------------------------
  // Shared header
  // ---------------------------------------------------------------------------
  const headerButtons = (
    <div className="flex flex-wrap items-center gap-3">
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
            onClick={copyForPodcast}
            disabled={allChunks.length === 0}
            title="Copy a prompt for Claude to write a full episode script in the Verse by Verse with Nate format, ready to record"
            className="rounded-md bg-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            🎙 Prepare for Podcast
          </button>
          <button
            type="button"
            onClick={copyPronunciationGuide}
            disabled={allChunks.length === 0}
            title="Copy a quick word + transliteration list to keep open while recording"
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            🗣 Pronunciation Guide
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
        <div className="text-right text-sm text-slate-300 space-y-0.5">
          {loadingChapter ? (
            <span>Loading…</span>
          ) : saveStatus ? (
            <span className="text-emerald-300">{saveStatus}</span>
           ) : (
           <span>&nbsp;</span>
          )}
          {syncStatus === 'syncing' && <div className="text-xs text-slate-400">Syncing…</div>}
          {syncStatus === 'synced' && <div className="text-xs text-emerald-400">Synced ✓</div>}
          {syncStatus === 'error' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400">⚠ Sync failed</span>
              <button
                type="button"
                onClick={async () => {
                  if (!project) return;
                  setSyncStatus('syncing');
                  const toSave = { ...project, lastEdited: Date.now() };
                  saveProjectToStorage(toSave);
                  const result = await saveRemoteProject(toSave);
                  setSyncStatus(result.ok ? 'synced' : 'error');
                  if (result.ok) window.setTimeout(() => setSyncStatus(''), 2500);
                }}
                className="text-xs text-slate-300 underline hover:text-white"
              >
                Retry
              </button>
            </div>
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openBibleReader}
                className="rounded-xl border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                📖 Read Bible
              </button>
              <button
                type="button"
                onClick={openNewProject}
                className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-600"
              >
                + New Project
              </button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {remoteOnlyProjects.length > 0 && (
            <div className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <p className="mb-3 text-sm font-semibold text-sky-800">
                📥 {remoteOnlyProjects.length} project{remoteOnlyProjects.length > 1 ? 's' : ''} found on the server that aren't saved locally:
              </p>
              <div className="flex flex-wrap gap-2">
                {remoteOnlyProjects.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => restoreRemoteProject(entry.id)}
                    className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600"
                  >
                    Restore "{entry.title}"
                  </button>
                ))}
              </div>
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

  // ---------------------------------------------------------------------------
  // BIBLE READER PAGE (plain read-only browsing)
  // ---------------------------------------------------------------------------
  if (currentPage === 'reader') {
    const readerBook = bookOptions.find((b) => b.abbrev === readerBookAbbrev);
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
              <h1 className="mt-2 text-2xl font-semibold">Read the Bible (BSB)</h1>
            </div>
            <button
              type="button"
              onClick={goHome}
              className="rounded-xl border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              ← Back to Studies
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
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
            {/* Font size */}
            <span className="text-xs text-slate-500 mr-1">Text size</span>
            {[['S', 0.875], ['M', 1], ['L', 1.125], ['XL', 1.25]].map(([label, size]) => (
              <button key={label} type="button"
                onClick={() => setReaderFontSize(size)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${readerFontSize === size ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
            <div className="mx-2 h-4 w-px bg-slate-200" />
            {/* Cross-refs toggle */}
            <button type="button"
              onClick={() => { setReaderShowCrossRefs((v) => !v); if (!readerShowCrossRefs) loadReaderCrossRefs(readerBookAbbrev, readerChapter); }}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${readerShowCrossRefs ? 'bg-amber-100 text-amber-800' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              {readerCrossRefsLoading ? 'Loading refs…' : '🔗 Cross-Refs'}
            </button>
            <div className="mx-2 h-4 w-px bg-slate-200" />
            {/* In-chapter search */}
            {readerSearchActive ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={readerSearch}
                  onChange={(e) => setReaderSearch(e.target.value)}
                  placeholder="Search this chapter…"
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
          </div>

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

          {/* Verses */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
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
              const searchLower = readerSearch.trim().toLowerCase();
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
                      <div key={verse.number} className="group rounded-xl transition"
                        style={bmColor ? { backgroundColor: bmColor + '55', borderLeft: `3px solid ${bmColor}`, paddingLeft: '0.5rem' } : {}}>
                        <div className="flex items-start gap-1">
                          {/* Verse number / interlinear toggle */}
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
                          {/* Verse text */}
                          <p className="flex-1">{highlightText(verse.text)}</p>
                          {/* Action icons — visible on hover */}
                          <span className="ml-1 mt-0.5 flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button"
                              onClick={() => toggleReaderBookmark(verseKey)}
                              className="rounded p-0.5 text-base leading-none hover:bg-slate-100"
                              title={bmColor ? 'Remove bookmark' : 'Bookmark this verse'}>
                              {bmColor ? '🔖' : '🏷️'}
                            </button>
                            {bmColor && (
                              <button type="button"
                                onClick={() => cycleBookmarkColor(verseKey)}
                                className="rounded p-0.5 text-base leading-none hover:bg-slate-100"
                                title="Change highlight colour">
                                🎨
                              </button>
                            )}
                            <button type="button"
                              onClick={() => copyVerse(readerBook?.name, readerChapter, verse.number, verse.text)}
                              className="rounded p-0.5 text-base leading-none hover:bg-slate-100"
                              title="Copy verse">
                              📋
                            </button>
                          </span>
                        </div>

                        {/* Cross-references */}
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

                        {/* Interlinear panel */}
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

  // ---------------------------------------------------------------------------
  // STUDY PAGE
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">{project?.title ?? ''}</h1>
          </div>
          {headerButtons}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className={`grid min-w-0 gap-8 ${studyLayout === 'split' ? '' : 'xl:grid-cols-[280px_1fr]'}`}>
          {/* Sidebar */}
          <aside className={`min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel ${studyLayout === 'split' ? 'hidden' : ''}`}>
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
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Chunk editor</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  {selectedChunk
                    ? `Section ${formatChunkReference(project, selectedChunkChapterIndex, selectedChunk, '–')}`
                    : 'Select a chunk'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  {selectedChunk
                    ? `Chunk ${selectedChunkGlobalIndex + 1} of ${allChunks.length}`
                    : 'Choose a chunk to study.'}
                </div>
                <button
                  type="button"
                  onClick={() => setStudyLayout((m) => (m === 'split' ? 'stacked' : 'split'))}
                  className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  title="Toggle two-pane study layout"
                >
                  {studyLayout === 'split' ? '☰ Stacked View' : '◫ Split View'}
                </button>
              </div>
            </div>

            {selectedChunk ? (
              <div className="mt-6 space-y-6">
              <div className={`space-y-6 ${studyLayout === 'split' ? 'lg:flex lg:items-start lg:gap-6 lg:space-y-0' : ''}`}>
                {/* Scripture */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' ? 'lg:sticky lg:top-6 lg:flex-1 lg:basis-0 lg:min-w-0 lg:self-start' : ''}`}>
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

                {/* Episode metadata for podcast prep — unique per chunk */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
                  <h3 className="text-sm font-semibold text-slate-900">Episode Info</h3>
                  <p className="text-xs text-slate-500">Used to label the script when preparing podcast content for this chunk.</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={selectedChunk?.episodeNumber ?? ''}
                      onChange={(e) => updateChunk(selectedChunk.id, { episodeNumber: e.target.value })}
                      placeholder="Episode #"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 sm:w-32"
                    />
                    <input
                      type="text"
                      value={selectedChunk?.episodeTitle ?? ''}
                      onChange={(e) => updateChunk(selectedChunk.id, { episodeTitle: e.target.value })}
                      placeholder="Episode title"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                </div>

                {/* Background / general notes — unique per chunk */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
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
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-4 ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
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

                {/* Tags */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' && activeStudyTab !== 'notes' ? 'hidden' : ''}`}>
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

                {/* Cross-references */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' && activeStudyTab !== 'crossRefs' ? 'hidden' : ''}`}>
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

                {/* Greek words */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' && activeStudyTab !== 'wordStudy' ? 'hidden' : ''}`}>
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
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' && activeStudyTab !== 'commentary' ? 'hidden' : ''}`}>
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

                {/* Final episode script archive */}
                <div className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 ${studyLayout === 'split' && activeStudyTab !== 'script' ? 'hidden' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setCollapsedSections((c) => ({ ...c, finalScript: !c.finalScript }))}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Final Script</h3>
                      <p className="text-xs text-slate-500">Paste the finished script for this chunk once Claude has helped you write it — keeps the project as a complete archive.</p>
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
                      placeholder="Paste the final recorded/recordable episode script here…"
                      className="mt-4 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                    />
                    </>
                  )}
                </div>

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

      {/* Greek word picker modal — portalled to document.body so it's never clipped by parent CSS */}
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
