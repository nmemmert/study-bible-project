import { useApp } from '../context/AppContext.js';
import {
  startMfaSetup,
  confirmMfaSetup,
  disableMfa,
  changePassword,
  updateProfile,
} from '../syncService.js';

export default function SettingsPage() {
  const {
    authUser, setAuthUser,
    authStatus,
    goHome,
    mfaSetup, setMfaSetup,
    mfaSetupCode, setMfaSetupCode,
    mfaSetupError, setMfaSetupError,
    mfaSetupBusy, setMfaSetupBusy,
    mfaBackupCodes, setMfaBackupCodes,
    mfaDisablePassword, setMfaDisablePassword,
    mfaDisableError, setMfaDisableError,
    podcastNameInput, setPodcastNameInput,
    podcastNameSaving, setPodcastNameSaving,
    podcastNameSaved, setPodcastNameSaved,
    changePasswordForm, setChangePasswordForm,
    changePasswordBusy, setChangePasswordBusy,
    changePasswordError, setChangePasswordError,
    changePasswordSaved, setChangePasswordSaved,
  } = useApp();

  const startSetup = async () => {
    setMfaSetupError('');
    setMfaSetupBusy(true);
    const result = await startMfaSetup();
    setMfaSetupBusy(false);
    if (!result.ok) {
      setMfaSetupError(result.error ?? 'Could not start 2FA setup.');
      return;
    }
    setMfaSetup(result.data);
    setMfaSetupCode('');
  };

  const confirmSetup = async (e) => {
    e.preventDefault();
    setMfaSetupError('');
    setMfaSetupBusy(true);
    const result = await confirmMfaSetup(mfaSetupCode.trim());
    setMfaSetupBusy(false);
    if (!result.ok) {
      setMfaSetupError(result.error ?? 'Invalid code.');
      return;
    }
    setMfaSetup(null);
    setMfaSetupCode('');
    setMfaBackupCodes(result.data.backupCodes);
    setAuthUser((u) => ({ ...u, totpEnabled: true }));
  };

  const cancelSetup = () => {
    setMfaSetup(null);
    setMfaSetupCode('');
    setMfaSetupError('');
  };

  const submitDisable = async (e) => {
    e.preventDefault();
    setMfaDisableError('');
    const result = await disableMfa(mfaDisablePassword);
    if (!result.ok) {
      setMfaDisableError(result.error ?? 'Incorrect password.');
      return;
    }
    setMfaDisablePassword('');
    setAuthUser((u) => ({ ...u, totpEnabled: false }));
  };

  const submitChangePassword = async (e) => {
    e.preventDefault();
    setChangePasswordError('');
    if (changePasswordForm.next !== changePasswordForm.confirm) {
      setChangePasswordError("New passwords don't match.");
      return;
    }
    setChangePasswordBusy(true);
    const result = await changePassword(changePasswordForm.current, changePasswordForm.next);
    setChangePasswordBusy(false);
    if (!result.ok) {
      setChangePasswordError(result.error ?? 'Failed to change password.');
      return;
    }
    setChangePasswordForm({ current: '', next: '', confirm: '' });
    setChangePasswordSaved(true);
    window.setTimeout(() => setChangePasswordSaved(false), 3000);
  };

  const submitPodcastName = async (e) => {
    e.preventDefault();
    setPodcastNameSaving(true);
    setPodcastNameSaved(false);
    const result = await updateProfile({ podcastName: podcastNameInput.trim() });
    setPodcastNameSaving(false);
    if (!result.ok) return;
    setAuthUser((u) => ({ ...u, podcastName: result.data.podcastName }));
    setPodcastNameSaved(true);
    window.setTimeout(() => setPodcastNameSaved(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Bible Study Project</p>
            <h1 className="mt-2 text-2xl font-semibold">Account Settings</h1>
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

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">Account</h2>
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{authUser.email}</span>
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Change password</h2>
            <p className="text-sm text-slate-500">Changing your password signs you out of every other device — this one stays signed in.</p>
          </div>
          <form onSubmit={submitChangePassword} className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Current password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={changePasswordForm.current}
                onChange={(e) => setChangePasswordForm((f) => ({ ...f, current: e.target.value }))}
                className="mt-1 block w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              New password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={changePasswordForm.next}
                onChange={(e) => setChangePasswordForm((f) => ({ ...f, next: e.target.value }))}
                className="mt-1 block w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirm new password
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={changePasswordForm.confirm}
                onChange={(e) => setChangePasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                className="mt-1 block w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
            {changePasswordError && <p className="text-sm text-rose-600">{changePasswordError}</p>}
            {changePasswordSaved && <p className="text-sm text-emerald-600">Password changed.</p>}
            <button
              type="submit"
              disabled={changePasswordBusy}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {changePasswordBusy ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Podcast / show name</h2>
            <p className="text-sm text-slate-500">
              Only needed if you use "🎙 Prepare for Podcast" on the study page — it fills in your show's
              name when asking Claude to write an episode script. Leave blank if you're just doing personal
              study; that button still works, it just won't name a specific show.
            </p>
          </div>
          <form onSubmit={submitPodcastName} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="text"
              value={podcastNameInput}
              onChange={(e) => setPodcastNameInput(e.target.value)}
              placeholder="e.g. Verse by Verse with Nate: A Journey Through Scripture"
              className="w-full flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            <button
              type="submit"
              disabled={podcastNameSaving}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {podcastNameSaving ? 'Saving…' : 'Save'}
            </button>
          </form>
          {podcastNameSaved && <p className="text-sm text-emerald-600">Saved.</p>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-panel space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Two-factor authentication</h2>
            <p className="text-sm text-slate-500">
              {authUser.totpEnabled
                ? "Enabled — you'll need a code from your authenticator app to sign in."
                : 'Add a 6-digit code from an authenticator app (Google Authenticator, Authy, 1Password, etc.) as a second step at sign-in.'}
            </p>
          </div>

          {mfaBackupCodes ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">
                Save these backup codes now — each works once if you ever lose your device. They won't be shown again.
              </p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm text-slate-800">
                {mfaBackupCodes.map((code) => (
                  <div key={code} className="rounded-lg border border-amber-200 bg-white px-3 py-1.5">{code}</div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMfaBackupCodes(null)}
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-400"
              >
                I've saved these codes
              </button>
            </div>
          ) : authUser.totpEnabled ? (
            <form onSubmit={submitDisable} className="space-y-3">
              <label className="block max-w-xs text-sm font-medium text-slate-700">
                Enter your password to disable 2FA
                <input
                  type="password"
                  required
                  value={mfaDisablePassword}
                  onChange={(e) => setMfaDisablePassword(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </label>
              {mfaDisableError && <p className="text-sm text-rose-600">{mfaDisableError}</p>}
              <button
                type="submit"
                className="rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-400"
              >
                Disable 2FA
              </button>
            </form>
          ) : mfaSetup ? (
            <form onSubmit={confirmSetup} className="space-y-4">
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                <img src={mfaSetup.qrCodeDataUrl} alt="2FA QR code" className="h-40 w-40 rounded-xl border border-slate-200" />
                <div className="space-y-1 text-sm text-slate-600">
                  <p>Scan this with your authenticator app, or enter the code manually:</p>
                  <p className="break-all rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs">{mfaSetup.secret}</p>
                </div>
              </div>
              <label className="block max-w-xs text-sm font-medium text-slate-700">
                Enter the 6-digit code it shows
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="123456"
                  value={mfaSetupCode}
                  onChange={(e) => setMfaSetupCode(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
                />
              </label>
              {mfaSetupError && <p className="text-sm text-rose-600">{mfaSetupError}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={mfaSetupBusy}
                  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {mfaSetupBusy ? 'Verifying…' : 'Confirm & enable'}
                </button>
                <button
                  type="button"
                  onClick={cancelSetup}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={startSetup}
                disabled={mfaSetupBusy}
                className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {mfaSetupBusy ? 'Starting…' : 'Enable 2FA'}
              </button>
              {mfaSetupError && <p className="text-sm text-rose-600">{mfaSetupError}</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
