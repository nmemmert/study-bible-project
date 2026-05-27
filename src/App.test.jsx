import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest';
import App from './App';

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------
const mockChapterData = {
  chapter: {
    content: [
      { type: 'verse', number: 1, content: ['Paul, a servant of God.'] },
      { type: 'verse', number: 2, content: ['In hope of eternal life.'] },
      { type: 'verse', number: 3, content: ['Grace and peace from God.'] },
    ],
  },
};

const mockGreekDefinition = [
  {
    topic: 'G4102',
    lexeme: 'πίστις',
    transliteration: 'pistis',
    short_definition: 'faith, belief',
    definition: '<p>Part(s) of speech: Noun</p><p>Faith or belief.</p>',
  },
];

function buildFetchMock({ chapterData = mockChapterData, greekData = null } = {}) {
  return vi.fn((url) => {
    if (url.includes('available_translations')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(['BSB', 'KJV']) });
    }
    if (url.includes('bible.helloao.org')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(chapterData) });
    }
    if (url.includes('bolls.life') && greekData !== null) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(greekData) });
    }
    return Promise.resolve({ ok: false });
  });
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.stubGlobal('fetch', buildFetchMock());
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function loadChapter() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getAllByRole('button', { name: /new project/i })[0]);
  await user.click(screen.getByRole('button', { name: /load chapter/i }));
  await screen.findByText(/Scripture & Chunks/i);
  return user;
}

function getVerseList() {
  return screen.getByTestId('verse-list');
}

function clickVerse(textFragment) {
  fireEvent.click(
    within(getVerseList()).getByRole('button', { name: new RegExp(textFragment) }),
  );
}

function shiftClickVerse(textFragment) {
  fireEvent.click(
    within(getVerseList()).getByRole('button', { name: new RegExp(textFragment) }),
    { shiftKey: true },
  );
}

function addChunk(startFragment, endFragment) {
  clickVerse(startFragment);
  shiftClickVerse(endFragment);
}

function findChunkCounter(n, total) {
  return screen.findByText((_, el) => el?.textContent === `Chunk ${n} of ${total}`);
}

// ---------------------------------------------------------------------------
// Initial render
// ---------------------------------------------------------------------------
describe('Initial render', () => {
  test('shows the home page with "My Studies" heading', () => {
    render(<App />);
    expect(screen.getByText('My Studies')).toBeInTheDocument();
  });

  test('shows "No projects yet" when storage is empty', () => {
    render(<App />);
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
  });

  test('shows "New Project" button on home page', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /new project/i }).length).toBeGreaterThan(0);
  });

  test('clicking "New Project" shows the project setup form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /new project/i })[0]);
    expect(screen.getByText('Project Setup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load chapter/i })).toBeInTheDocument();
  });

  test('setup form shows translation, book, and chapter inputs', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /new project/i })[0]);
    expect(screen.getByText('Translation')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Chapter')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Loading a chapter
// ---------------------------------------------------------------------------
describe('Loading a chapter', () => {
  test('transitions to the chunk setup view on success', async () => {
    await loadChapter();
    expect(screen.getByText(/Scripture & Chunks/i)).toBeInTheDocument();
  });

  test('renders verse text after loading', async () => {
    await loadChapter();
    expect(screen.getByText(/Paul, a servant of God/i)).toBeInTheDocument();
  });

  test('shows "0 created" initially', async () => {
    await loadChapter();
    expect(screen.getByText('0 created')).toBeInTheDocument();
  });

  test('shows an error message when the API returns a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.includes('available_translations')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(['BSB']) });
      }
      return Promise.resolve({ ok: false });
    }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /new project/i })[0]);
    await user.click(screen.getByRole('button', { name: /load chapter/i }));
    await screen.findByText(/unable to load chapter/i);
  });

  test('shows an error message when chapter data contains no verses', async () => {
    vi.stubGlobal('fetch', buildFetchMock({ chapterData: { chapter: { content: [] } } }));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /new project/i })[0]);
    await user.click(screen.getByRole('button', { name: /load chapter/i }));
    await screen.findByText(/invalid bible data/i);

  });
});

// ---------------------------------------------------------------------------
// Chunk management
// ---------------------------------------------------------------------------
describe('Chunk management', () => {
  test('creates a chunk by clicking a verse range', async () => {
    await loadChapter();
    addChunk('Paul, a servant', 'Grace and peace');
    await screen.findByText(/1-3/);
  });

  test('chunk count increments after each addition', async () => {
    await loadChapter();
    addChunk('Paul, a servant', 'Paul, a servant');
    await screen.findByText('1 created');
    addChunk('In hope of eternal', 'Grace and peace');
    await screen.findByText('2 created');
  });

  test('prevents adding a duplicate chunk range', async () => {
    await loadChapter();
    addChunk('Paul, a servant', 'In hope of eternal');
    await screen.findByText('1 created');
    addChunk('Paul, a servant', 'In hope of eternal');
    await screen.findByText(/That chunk already exists/i);
  });

  test('deletes a chunk', async () => {
    await loadChapter();
    addChunk('Paul, a servant', 'In hope of eternal');
    await screen.findByText('1 created');
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await screen.findByText('0 created');
  });

  test('"Begin Studying" is disabled when no chunks exist', async () => {
    await loadChapter();
    expect(screen.getByRole('button', { name: /begin studying/i })).toBeDisabled();
  });

  test('"Begin Studying" is enabled once a chunk exists', async () => {
    await loadChapter();
    addChunk('Paul, a servant', 'In hope of eternal');
    await screen.findByText('1 created');
    expect(screen.getByRole('button', { name: /begin studying/i })).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Study view navigation
// ---------------------------------------------------------------------------
async function goToStudyWith3Chunks() {
  await loadChapter();
  addChunk('Paul, a servant', 'Paul, a servant');
  addChunk('In hope of eternal', 'In hope of eternal');
  addChunk('Grace and peace', 'Grace and peace');
  await screen.findByText('3 created');
  fireEvent.click(screen.getByRole('button', { name: /begin studying/i }));
  await screen.findByText(/chunk editor/i);
  // addChunk always selects the newest chunk; navigate back to chunk 1
  // so navigation tests start from a known position.
  fireEvent.click(screen.getByRole('button', { name: /previous chunk/i }));
  fireEvent.click(screen.getByRole('button', { name: /previous chunk/i }));
  expect(await findChunkCounter(1, 3)).toBeInTheDocument();
}

describe('Study view navigation', () => {
  test('transitions to study view when "Begin Studying" is clicked', async () => {
    await loadChapter();
    addChunk('Paul, a servant', 'In hope of eternal');
    await screen.findByText('1 created');
    fireEvent.click(screen.getByRole('button', { name: /begin studying/i }));
    await screen.findByText(/chunk editor/i);
  });

  test('"Previous Chunk" is disabled on the first chunk', async () => {
    await goToStudyWith3Chunks();
    expect(screen.getByRole('button', { name: /previous chunk/i })).toBeDisabled();
  });

  test('"Next Chunk" advances to the second chunk', async () => {
    await goToStudyWith3Chunks();
    expect(await findChunkCounter(1, 3)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next chunk/i }));
    expect(await findChunkCounter(2, 3)).toBeInTheDocument();
  });

  test('"Next Chunk" is disabled on the last chunk', async () => {
    await goToStudyWith3Chunks();
    fireEvent.click(screen.getByRole('button', { name: /next chunk/i }));
    fireEvent.click(screen.getByRole('button', { name: /next chunk/i }));
    expect(await findChunkCounter(3, 3)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next chunk/i })).toBeDisabled();
  });

  test('"Previous Chunk" returns to prior chunk after advancing', async () => {
    await goToStudyWith3Chunks();
    fireEvent.click(screen.getByRole('button', { name: /next chunk/i }));
    expect(await findChunkCounter(2, 3)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /previous chunk/i }));
    expect(await findChunkCounter(1, 3)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Greek word lookup
// ---------------------------------------------------------------------------
async function goToStudyAndAddGreekWord(fetchMock) {
  if (fetchMock) vi.stubGlobal('fetch', fetchMock);
  await loadChapter();
  addChunk('Paul, a servant', 'In hope of eternal');
  await screen.findByText('1 created');
  fireEvent.click(screen.getByRole('button', { name: /begin studying/i }));
  await screen.findByText(/chunk editor/i);
  fireEvent.click(screen.getByRole('button', { name: /add greek word/i }));
  await screen.findByPlaceholderText(/G4102, 4102/i);
}

describe('Greek word lookup', () => {
  test('adds a Greek word entry form', async () => {
    await goToStudyAndAddGreekWord();
    expect(screen.getByPlaceholderText(/G4102, 4102/i)).toBeInTheDocument();
  });

  test('populates fields after a successful lookup', async () => {
    await goToStudyAndAddGreekWord(buildFetchMock({ greekData: mockGreekDefinition }));
    fireEvent.change(screen.getByPlaceholderText(/G4102, 4102/i), { target: { value: 'G4102' } });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));
    await screen.findByDisplayValue('πίστις');
    expect(screen.getByDisplayValue('pistis')).toBeInTheDocument();
    expect(screen.getByDisplayValue('faith, belief')).toBeInTheDocument();
  });

  test('shows "No definition found." when the API returns an empty array', async () => {
    await goToStudyAndAddGreekWord(buildFetchMock({ greekData: [] }));
    fireEvent.change(screen.getByPlaceholderText(/G4102, 4102/i), { target: { value: 'G4102' } });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));
    await screen.findByDisplayValue('No definition found.');
  });

  test('shows "Lookup failed." on network error', async () => {
    await goToStudyAndAddGreekWord(
      vi.fn((url) => {
        if (url.includes('available_translations')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(['BSB']) });
        }
        if (url.includes('bible.helloao.org')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockChapterData) });
        }
        return Promise.reject(new Error('Network error'));
      }),
    );
    fireEvent.change(screen.getByPlaceholderText(/G4102, 4102/i), { target: { value: 'G4102' } });
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));
    await screen.findByDisplayValue('Lookup failed.');
  });

  test('lookup is skipped when query is empty', async () => {
    const fetchSpy = buildFetchMock();
    await goToStudyAndAddGreekWord(fetchSpy);
    const callCountBefore = fetchSpy.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /look up/i }));
    await waitFor(() => {
      expect(fetchSpy.mock.calls.length).toBe(callCountBefore);
    });
  });

  test('removes a Greek word entry', async () => {
    await goToStudyAndAddGreekWord();
    expect(screen.getByPlaceholderText(/G4102, 4102/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/G4102, 4102/i)).not.toBeInTheDocument();
    });
  });
});
