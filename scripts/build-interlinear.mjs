// One-time/offline data prep: convert the BSB Translation Tables (bereanbible.com/bsb_tables.tsv)
// into per-book JSON files of word-by-word interlinear data for /public/interlinear/.
//
// Usage: node scripts/build-interlinear.mjs /path/to/bsb_tables.tsv

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const BOOK_ABBREV = {
  Genesis: 'GEN', Exodus: 'EXO', Leviticus: 'LEV', Numbers: 'NUM', Deuteronomy: 'DEU',
  Joshua: 'JOS', Judges: 'JDG', Ruth: 'RUT', '1 Samuel': '1SA', '2 Samuel': '2SA',
  '1 Kings': '1KI', '2 Kings': '2KI', '1 Chronicles': '1CH', '2 Chronicles': '2CH',
  Ezra: 'EZR', Nehemiah: 'NEH', Esther: 'EST', Job: 'JOB', Psalm: 'PSA', Proverbs: 'PRO',
  Ecclesiastes: 'ECC', 'Song of Solomon': 'SNG', Isaiah: 'ISA', Jeremiah: 'JER',
  Lamentations: 'LAM', Ezekiel: 'EZK', Daniel: 'DAN', Hosea: 'HOS', Joel: 'JOL',
  Amos: 'AMO', Obadiah: 'OBA', Jonah: 'JON', Micah: 'MIC', Nahum: 'NAM', Habakkuk: 'HAB',
  Zephaniah: 'ZEP', Haggai: 'HAG', Zechariah: 'ZEC', Malachi: 'MAL',
  Matthew: 'MAT', Mark: 'MRK', Luke: 'LUK', John: 'JHN', Acts: 'ACT', Romans: 'ROM',
  '1 Corinthians': '1CO', '2 Corinthians': '2CO', Galatians: 'GAL', Ephesians: 'EPH',
  Philippians: 'PHP', Colossians: 'COL', '1 Thessalonians': '1TH', '2 Thessalonians': '2TH',
  '1 Timothy': '1TI', '2 Timothy': '2TI', Titus: 'TIT', Philemon: 'PHM', Hebrews: 'HEB',
  James: 'JAS', '1 Peter': '1PE', '2 Peter': '2PE', '1 John': '1JN', '2 John': '2JN',
  '3 John': '3JN', Jude: 'JUD', Revelation: 'REV',
};

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node scripts/build-interlinear.mjs /path/to/bsb_tables.tsv');
  process.exit(1);
}

const outDir = path.resolve('public/interlinear');
fs.mkdirSync(outDir, { recursive: true });

const raw = fs.readFileSync(inputPath, 'utf-8');
const records = parse(raw, { delimiter: '\t', columns: false, relax_column_count: true });
const header = records[0];
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

// books[ABBREV][chapter][verse] = [{ o, t, p, s, g }]
const books = {};
let curVerseId = '';

for (let i = 1; i < records.length; i++) {
  const row = records[i];
  const verseId = row[idx.VerseId];
  if (verseId) curVerseId = verseId;
  if (!curVerseId) continue;

  const lang = row[idx.Language];
  const original = (lang === 'Hebrew' || lang === 'Aramaic')
    ? row[idx['WLC / Nestle Base TR RP WH NE NA SBL']]
    : row[idx['WLC / Nestle Base TR RP WH NE NA SBL']];
  if (!original || !original.trim()) continue;

  const strongs = row[idx['Str Heb']] || row[idx['Str Grk']] || '';
  const gloss = (row[idx['BSB version']] || '').replace(/\s+/g, ' ').trim();
  const translit = (row[idx.Translit] || '').trim();
  const parsing = (row[idx.Parsing] || '').trim();
  const sortKey = (lang === 'Hebrew' || lang === 'Aramaic')
    ? row[idx['Heb Sort']]
    : row[idx['Greek Sort']];

  const m = curVerseId.match(/^(.*) (\d+):(\d+)$/);
  if (!m) continue;
  const [, bookName, chapter, verse] = m;
  const abbrev = BOOK_ABBREV[bookName];
  if (!abbrev) continue;

  books[abbrev] ??= {};
  books[abbrev][chapter] ??= {};
  books[abbrev][chapter][verse] ??= [];
  books[abbrev][chapter][verse].push({
    sort: Number(sortKey) || 0,
    o: original.trim(),
    t: translit,
    p: parsing,
    s: strongs ? `${(lang === 'Hebrew' || lang === 'Aramaic') ? 'H' : 'G'}${strongs}` : '',
    g: gloss,
  });
}

let fileCount = 0;
for (const [abbrev, chapters] of Object.entries(books)) {
  for (const chapter of Object.values(chapters)) {
    for (const verse of Object.values(chapter)) {
      verse.sort((a, b) => a.sort - b.sort);
      for (const w of verse) delete w.sort;
    }
  }
  fs.writeFileSync(path.join(outDir, `${abbrev}.json`), JSON.stringify(chapters));
  fileCount++;
}

console.log(`Wrote ${fileCount} book files to ${outDir}`);
