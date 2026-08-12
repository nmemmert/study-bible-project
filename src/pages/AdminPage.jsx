import { useApp } from '../context/AppContext.js';
import { buildExportHtml } from '../App.jsx';
import {
  adminDeleteUser,
  adminDeleteProject,
  adminGetProject,
  adminResetPassword,
} from '../syncService.js';

export default function AdminPage() {
  const {
    authUser,
    authStatus,
    goHome,
    adminTab, setAdminTab,
    adminUsers,
    adminProjects,
    adminLoading,
    adminError,
    adminViewProject, setAdminViewProject,
    adminResetResult, setAdminResetResult,
    loadAdminData,
  } = useApp();

  const handleDeleteUserAdmin = async (id, email) => {
    if (!window.confirm(`Delete account "${email}"? Their projects are kept, not deleted, but become inaccessible until reassigned.`)) return;
    const result = await adminDeleteUser(id);
    if (result.ok) loadAdminData();
    else alert(result.error ?? 'Failed to delete user.');
  };

  const handleDeleteProjectAdmin = async (id, title) => {
    if (!window.confirm(`Permanently delete project "${title}"? This cannot be undone.`)) return;
    const result = await adminDeleteProject(id);
    if (result.ok) loadAdminData();
    else alert(result.error ?? 'Failed to delete project.');
  };

  const handleViewProjectAdmin = async (id) => {
    const result = await adminGetProject(id);
    if (result.ok) setAdminViewProject(result.data);
    else alert(result.error ?? 'Failed to load project.');
  };

  const handleResetPasswordAdmin = async (id, email) => {
    if (!window.confirm(`Reset the password for "${email}"? They'll be signed out everywhere and need the new temporary password to log back in.`)) return;
    const result = await adminResetPassword(id);
    if (result.ok) setAdminResetResult({ email, temporaryPassword: result.data.temporaryPassword });
    else alert(result.error ?? 'Failed to reset password.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">🛡 Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goHome}
              className="rounded-xl border border-slate-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              ← Back
            </button>
            {authStatus}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex gap-2">
          <button type="button" onClick={() => setAdminTab('users')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${adminTab === 'users' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
            Users ({adminUsers.length})
          </button>
          <button type="button" onClick={() => setAdminTab('projects')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${adminTab === 'projects' ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
            Projects ({adminProjects.length})
          </button>
        </div>

        {adminLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {adminError && <p className="text-sm text-rose-600">{adminError}</p>}

        {!adminLoading && !adminError && adminTab === 'users' && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">2FA</th>
                  <th className="px-4 py-3">Projects</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {u.email}{u.id === authUser.id && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500">{u.totpEnabled ? '✓' : '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{u.projectCount}</td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== authUser.id && (
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => handleResetPasswordAdmin(u.id, u.email)}
                            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            Reset Password
                          </button>
                          <button type="button" onClick={() => handleDeleteUserAdmin(u.id, u.email)}
                            className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {!adminLoading && !adminError && adminTab === 'projects' && (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Passage</th>
                  <th className="px-4 py-3">Last edited</th>
                  <th className="px-4 py-3">Shared</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {adminProjects.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.title}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.ownerEmail ?? <span className="italic text-slate-400">orphaned</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.chapterSummary}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(p.lastEdited).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-slate-500">{p.shareToken ? '🔗' : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => handleViewProjectAdmin(p.id)}
                          className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          View
                        </button>
                        <button type="button" onClick={() => handleDeleteProjectAdmin(p.id, p.title)}
                          className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>

      {adminViewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAdminViewProject(null)}>
          <div className="h-full w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">{adminViewProject.title}</p>
              <button type="button" onClick={() => setAdminViewProject(null)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                Close
              </button>
            </div>
            <iframe
              title="Project preview"
              srcDoc={buildExportHtml(adminViewProject)}
              sandbox="allow-popups"
              className="h-[calc(100%-3rem)] w-full border-0"
            />
          </div>
        </div>
      )}

      {adminResetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-900">Password reset</h3>
            <p className="mt-1 text-xs text-slate-500">
              Relay this to <span className="font-medium text-slate-700">{adminResetResult.email}</span> yourself
              (text, call, in person) — it won't be shown again. They're signed out everywhere until they log in with it.
            </p>
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center font-mono text-lg tracking-wider text-amber-800">
              {adminResetResult.temporaryPassword}
            </p>
            <button type="button" onClick={() => setAdminResetResult(null)}
              className="mt-4 w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
