import { describe, test, expect } from 'vitest';
import {
  storageKey,
  extractPartOfSpeech,
  htmlToPlainText,
  renderVerseContent,
  parseBibleChapter,
  wordTableHtml,
  buildExportHtml,
  createParagraphsFromText,
} from './App.jsx';

// ---------------------------------------------------------------------------
// storageKey
// ---------------------------------------------------------------------------
describe('storageKey', () => {
  test('formats key with translation, book, and chapter', () => {
    expect(storageKey('BSB', 'TIT', '1')).toBe('bible-study-BSB-TIT-1');
  });

  test('handles different values', () => {
    expect(storageKey('KJV', 'MAT', '5')).toBe('bible-study-KJV-MAT-5');
  });
});

// ---------------------------------------------------------------------------
// extractPartOfSpeech
// ---------------------------------------------------------------------------
describe('extractPartOfSpeech', () => {
  test('extracts single-word part of speech', () => {
    expect(extractPartOfSpeech('<p>Part(s) of speech: Noun</p>')).toBe('Noun');
  });

  test('extracts multi-word part of speech', () => {
    expect(extractPartOfSpeech('<p>Part(s) of speech: Verb, Intransitive</p>')).toBe('Verb, Intransitive');
  });

  test('is case-insensitive on the label', () => {
    expect(extractPartOfSpeech('<p>PART(S) OF SPEECH: Adjective</p>')).toBe('Adjective');
  });

  test('returns empty string when label is absent', () => {
    expect(extractPartOfSpeech('<p>Some other text</p>')).toBe('');
  });

  test('returns empty string for empty input', () => {
    expect(extractPartOfSpeech('')).toBe('');
  });

  test('returns empty string for null', () => {
    expect(extractPartOfSpeech(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(extractPartOfSpeech(undefined)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// htmlToPlainText
// ---------------------------------------------------------------------------
describe('htmlToPlainText', () => {
  test('extracts text from a paragraph', () => {
    expect(htmlToPlainText('<p>Hello world</p>')).toBe('Hello world');
  });

  test('returns empty string for empty input', () => {
    expect(htmlToPlainText('')).toBe('');
  });

  test('strips script tags leaving safe text intact (XSS regression)', () => {
    const result = htmlToPlainText('<script>alert("xss")</script>Safe text');
    expect(result).not.toContain('<script>');
    expect(result).toContain('Safe text');
  });

  test('extracts text from nested elements', () => {
    const result = htmlToPlainText('<div><p>Line one</p><p>Line two</p></div>');
    expect(result).toContain('Line one');
    expect(result).toContain('Line two');
  });

  test('collapses multiple consecutive newlines into one', () => {
    const result = htmlToPlainText('<p>A</p><p></p><p></p><p>B</p>');
    expect(result).not.toMatch(/\n{2,}/);
  });

  test('trims leading and trailing whitespace', () => {
    const result = htmlToPlainText('  <p>  text  </p>  ');
    expect(result).toBe(result.trim());
  });
});

// ---------------------------------------------------------------------------
// renderVerseContent
// ---------------------------------------------------------------------------
describe('renderVerseContent', () => {
  test('returns a string unchanged', () => {
    expect(renderVerseContent('hello world')).toBe('hello world');
  });

  test('joins an array of strings', () => {
    expect(renderVerseContent(['hello', ' ', 'world'])).toBe('hello world');
  });

  test('recursively renders mixed-type arrays', () => {
    expect(renderVerseContent(['a', { lineBreak: true }, 'b'])).toBe('a\nb');
  });

  test('returns newline for lineBreak object', () => {
    expect(renderVerseContent({ lineBreak: true })).toBe('\n');
  });

  test('returns newline for type:line_break object', () => {
    expect(renderVerseContent({ type: 'line_break' })).toBe('\n');
  });

  test('renders nested content arrays', () => {
    expect(renderVerseContent({ content: ['hello', ' ', 'world'] })).toBe('hello world');
  });

  test('returns empty string for an empty object', () => {
    expect(renderVerseContent({})).toBe('');
  });

  test('returns empty string for an object with unknown type and no content', () => {
    expect(renderVerseContent({ type: 'unknown' })).toBe('');
  });

  test('returns empty string for null', () => {
    expect(renderVerseContent(null)).toBe('');
  });

  test('returns empty string for undefined', () => {
    expect(renderVerseContent(undefined)).toBe('');
  });

  test('returns empty string for a number', () => {
    expect(renderVerseContent(42)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseBibleChapter
// ---------------------------------------------------------------------------
describe('parseBibleChapter', () => {
  test('parses format A (verses array)', () => {
    const data = {
      verses: [
        { number: 1, text: 'In the beginning.' },
        { number: 2, text: 'The earth was formless.' },
      ],
    };
    expect(parseBibleChapter(data)).toEqual([
      { number: 1, text: 'In the beginning.' },
      { number: 2, text: 'The earth was formless.' },
    ]);
  });

  test('parses format B (chapter.content array)', () => {
    const data = {
      chapter: {
        content: [
          { type: 'heading', content: ['Genesis'] },
          { type: 'verse', number: 1, content: ['In the beginning.'] },
          { type: 'verse', number: 2, content: ['The earth was formless.'] },
        ],
      },
    };
    const result = parseBibleChapter(data);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ number: 1, text: 'In the beginning.' });
    expect(result[1]).toEqual({ number: 2, text: 'The earth was formless.' });
  });

  test('filters out non-verse items in format B', () => {
    const data = {
      chapter: {
        content: [
          { type: 'heading', content: ['Title'] },
          { type: 'verse', number: 1, content: ['Verse text.'] },
          { type: 'note', content: ['A footnote.'] },
        ],
      },
    };
    const result = parseBibleChapter(data);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });

  test('normalises excessive whitespace in verse text', () => {
    const data = {
      chapter: {
        content: [{ type: 'verse', number: 1, content: ['  Extra   spaces  '] }],
      },
    };
    expect(parseBibleChapter(data)[0].text).toBe('Extra spaces');
  });

  test('returns empty array for null', () => {
    expect(parseBibleChapter(null)).toEqual([]);
  });

  test('returns empty array for undefined', () => {
    expect(parseBibleChapter(undefined)).toEqual([]);
  });

  test('returns empty array for empty object', () => {
    expect(parseBibleChapter({})).toEqual([]);
  });

  test('returns empty array when chapter.content is missing', () => {
    expect(parseBibleChapter({ chapter: {} })).toEqual([]);
  });

  test('returns empty array when chapter.content is empty', () => {
    expect(parseBibleChapter({ chapter: { content: [] } })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// wordTableHtml
// ---------------------------------------------------------------------------
describe('wordTableHtml', () => {
  test('generates a table with all header columns', () => {
    const html = wordTableHtml('');
    expect(html).toContain('<table>');
    expect(html).toContain("Strong's");
    expect(html).toContain('Greek');
    expect(html).toContain('Transliteration');
    expect(html).toContain('Part of Speech');
    expect(html).toContain('Short Definition');
  });

  test('injects provided rows into tbody', () => {
    const rows = '<tr><td>G4102</td><td>πίστις</td></tr>';
    const html = wordTableHtml(rows);
    expect(html).toContain('G4102');
    expect(html).toContain('πίστις');
  });

  test('produces valid table structure', () => {
    const html = wordTableHtml('');
    expect(html).toContain('<thead>');
    expect(html).toContain('<tbody>');
    expect(html).toContain('</table>');
  });
});

// ---------------------------------------------------------------------------
// buildExportHtml
// ---------------------------------------------------------------------------
const baseProject = {
  title: 'Titus 1 Study',
  translation: 'BSB',
  book: 'Titus',
  chapter: '1',
  verses: [
    { number: 1, text: 'Paul, a servant of God.' },
    { number: 2, text: 'In hope of eternal life.' },
  ],
  chunks: [
    {
      id: 'chunk-1',
      startVerse: 1,
      endVerse: 2,
      notes: 'Key observations.',
      greekWords: [
        {
          strongNumber: 'G1401',
          lexeme: 'δοῦλος',
          transliteration: 'doulos',
          partOfSpeech: 'Noun',
          shortDefinition: 'a slave',
          definitionHtml: '<p>Part(s) of speech: Noun</p><p>A slave or servant.</p>',
        },
      ],
    },
  ],
};

describe('buildExportHtml', () => {
  test('produces a valid HTML document', () => {
    const html = buildExportHtml(baseProject);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
  });

  test('includes the project title', () => {
    expect(buildExportHtml(baseProject)).toContain('Titus 1 Study');
  });

  test('includes translation, book, and chapter heading', () => {
    const html = buildExportHtml(baseProject);
    expect(html).toContain('BSB');
    expect(html).toContain('Titus');
    expect(html).toContain('Titus 1');
  });

  test('includes verse text for the chunk range', () => {
    const html = buildExportHtml(baseProject);
    expect(html).toContain('Paul, a servant of God.');
    expect(html).toContain('In hope of eternal life.');
  });

  test('includes study notes', () => {
    expect(buildExportHtml(baseProject)).toContain('Key observations.');
  });

  test('includes Greek word data', () => {
    const html = buildExportHtml(baseProject);
    expect(html).toContain('G1401');
    expect(html).toContain('δοῦλος');
    expect(html).toContain('doulos');
    expect(html).toContain('a slave');
  });

  test('formats a single-verse reference without a range dash', () => {
    const project = {
      ...baseProject,
      chunks: [{ ...baseProject.chunks[0], startVerse: 1, endVerse: 1 }],
    };
    const html = buildExportHtml(project);
    expect(html).toContain('Titus 1:1');
    expect(html).not.toContain('Titus 1:1-1');
  });

  test('formats a multi-verse reference with a range dash', () => {
    expect(buildExportHtml(baseProject)).toContain('Titus 1:1-2');
  });

  test('shows "No notes." when chunk notes are empty', () => {
    const project = { ...baseProject, chunks: [{ ...baseProject.chunks[0], notes: '' }] };
    expect(buildExportHtml(project)).toContain('No notes.');
  });

  test('shows "No Greek word notes." when chunk has no Greek words', () => {
    const project = { ...baseProject, chunks: [{ ...baseProject.chunks[0], greekWords: [] }] };
    expect(buildExportHtml(project)).toContain('No Greek word notes.');
  });

  test('handles a project with no chunks', () => {
    const project = { ...baseProject, chunks: [] };
    const html = buildExportHtml(project);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Titus 1 Study');
  });

  test('only includes verses that fall within the chunk range', () => {
    const project = {
      ...baseProject,
      verses: [
        { number: 1, text: 'Verse one text.' },
        { number: 2, text: 'Verse two text.' },
        { number: 3, text: 'Verse three text.' },
      ],
      chunks: [{ ...baseProject.chunks[0], startVerse: 2, endVerse: 2, greekWords: [] }],
    };
    const html = buildExportHtml(project);
    expect(html).toContain('Verse two text.');
    expect(html).not.toContain('Verse one text.');
    expect(html).not.toContain('Verse three text.');
  });
});

// ---------------------------------------------------------------------------
// createParagraphsFromText
// ---------------------------------------------------------------------------
describe('createParagraphsFromText', () => {
  test('returns one paragraph per non-empty line', () => {
    const result = createParagraphsFromText('Line one\nLine two\nLine three');
    expect(result).toHaveLength(3);
  });

  test('filters out empty lines', () => {
    const result = createParagraphsFromText('Line one\n\n\nLine two');
    expect(result).toHaveLength(2);
  });

  test('returns an empty array for blank input', () => {
    expect(createParagraphsFromText('')).toHaveLength(0);
    expect(createParagraphsFromText('\n\n\n')).toHaveLength(0);
  });

  test('trims whitespace from each line', () => {
    const result = createParagraphsFromText('  hello  \n  world  ');
    expect(result).toHaveLength(2);
  });
});
