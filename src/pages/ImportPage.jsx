import { useApp } from '../context/AppContext.js';
import { bookOptions } from '../App.jsx';

export default function ImportPage() {
  const {
    authStatus,
    setCurrentPage,
    availableTranslations,
    importBookAbbrev, setImportBookAbbrev,
    importTranslation, setImportTranslation,
    importTitle, setImportTitle,
    importFile,
    importPreview,
    importBusy,
    importError,
    handleImportFileChange,
    runEpisodeImport,
  } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">Import Session List</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              className="rounded-xl border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              ← Back
            </button>
            {authStatus}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
            <p className="font-semibold text-slate-700">How this works</p>
            <p>
              This is a shortcut for setting up a multi-part study — a teaching series, sermon series, class
              curriculum, or podcast — all at once, instead of building each chapter and chunk by hand.
            </p>
            <p>
              Upload a .docx containing a table with three columns: session number, title, and passage
              (e.g. <span className="font-mono text-xs">1:1–2</span>). Each row becomes one chunk, grouped
              automatically by chapter. If you don't have a document like this, just use{' '}
              <span className="font-semibold">+ New Project</span> on the home page instead — this import
              step is entirely optional.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Book
              <select
                value={importBookAbbrev}
                onChange={(e) => setImportBookAbbrev(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {bookOptions.map((b) => (
                  <option key={b.abbrev} value={b.abbrev}>{b.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Translation
              <select
                value={importTranslation}
                onChange={(e) => setImportTranslation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {availableTranslations.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Project title
            <input
              type="text"
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder={`${bookOptions.find((b) => b.abbrev === importBookAbbrev)?.name ?? ''} Sessions`}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Session list (.docx)
            <input
              type="file"
              accept=".docx"
              onChange={(e) => handleImportFileChange(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-600"
            />
          </label>

          {importBusy && <p className="text-sm text-slate-500">Working…</p>}
          {importError && <p className="text-sm text-rose-600">{importError}</p>}

          {importPreview && !importBusy && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                {importPreview.length} session{importPreview.length === 1 ? '' : 's'} found
                {' · '}
                {importPreview.filter((s) => s.parsed && s.parsed !== 'invalid').length} with passages
              </p>
              <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <tbody>
                    {importPreview.map((spec) => (
                      <tr key={spec.episodeNumber} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-1.5 text-slate-500">#{spec.episodeNumber}</td>
                        <td className="px-3 py-1.5 text-slate-900">{spec.title}</td>
                        <td className="px-3 py-1.5 text-right text-slate-500">
                          {spec.parsed === 'invalid'
                            ? <span className="text-rose-600">unrecognized — skipped</span>
                            : spec.parsed
                              ? spec.passage
                              : <span className="text-slate-400">marker (no passage)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={runEpisodeImport}
                disabled={importBusy}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Create Project from Import
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
