import { useApp } from '../context/AppContext.js';
import { loginUser, registerUser, verifyMfaLogin, logoutUser } from '../syncService.js';
import { switchStorageUser } from '../App.jsx';

export default function AuthPage() {
  const {
    authMode, setAuthMode,
    authForm, setAuthForm,
    authError, setAuthError,
    authBusy, setAuthBusy,
    authMfaPending, setAuthMfaPending,
    authMfaCode, setAuthMfaCode,
    authMfaUseBackup, setAuthMfaUseBackup,
    setAuthUser,
    setProjectIndex,
  } = useApp();

  const submitAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    const action = authMode === 'login' ? loginUser : registerUser;
    const result = await action(authForm.email.trim(), authForm.password);
    setAuthBusy(false);
    if (!result.ok) {
      setAuthError(result.error ?? 'Something went wrong.');
      return;
    }
    if (result.data?.mfaRequired) {
      setAuthMfaPending(true);
      return;
    }
    setAuthUser(result.data);
    setProjectIndex(switchStorageUser(result.data.id));
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    const result = await verifyMfaLogin(
      authMfaUseBackup ? { backupCode: authMfaCode.trim() } : { token: authMfaCode.trim() },
    );
    setAuthBusy(false);
    if (!result.ok) {
      setAuthError(result.error ?? 'Invalid code.');
      return;
    }
    setAuthMfaPending(false);
    setAuthMfaCode('');
    setAuthUser(result.data);
    setProjectIndex(switchStorageUser(result.data.id));
  };

  if (authMfaPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Bible Study Project</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">Two-factor verification</h1>
          <p className="mt-2 text-sm text-slate-500">
            {authMfaUseBackup
              ? 'Enter one of your saved backup codes.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>
          <form onSubmit={submitMfa} className="mt-6 space-y-4">
            <input
              type="text"
              required
              autoFocus
              inputMode={authMfaUseBackup ? 'text' : 'numeric'}
              placeholder={authMfaUseBackup ? 'xxxxxxxxxx' : '123456'}
              value={authMfaCode}
              onChange={(e) => setAuthMfaCode(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-center text-lg tracking-widest shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
            {authError && <p className="text-sm text-rose-600">{authError}</p>}
            <button
              type="submit"
              disabled={authBusy}
              className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {authBusy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setAuthMfaUseBackup((v) => !v);
              setAuthMfaCode('');
              setAuthError('');
            }}
            className="mt-4 w-full text-center text-sm text-slate-500 underline hover:text-slate-700"
          >
            {authMfaUseBackup ? 'Use your authenticator app instead' : "Lost your device? Use a backup code"}
          </button>
          <button
            type="button"
            onClick={async () => {
              await logoutUser();
              setAuthMfaPending(false);
              setAuthMfaCode('');
              setAuthError('');
            }}
            className="mt-2 w-full text-center text-sm text-slate-400 underline hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="grid w-full max-w-5xl items-center gap-16 lg:grid-cols-2">
        {/* Branding / feature panel — hidden on small screens to keep the form front and center there */}
        <div className="hidden lg:block">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Bible Study Project</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-white">
            Deep Bible study,<br />organized chunk by chunk.
          </h1>
          <p className="mt-4 max-w-sm text-slate-300">
            Split any passage into chunks and work through Observation, Interpretation, and
            Application notes alongside Greek &amp; Hebrew word studies, cross-references, and commentary.
          </p>
          <ul className="mt-8 space-y-4 text-sm text-slate-300">
            <li className="flex items-center gap-3"><span className="text-lg">📖</span> Chunk-by-chunk OIA notes on any passage</li>
            <li className="flex items-center gap-3"><span className="text-lg">🔤</span> Greek &amp; Hebrew word studies with pronunciation</li>
            <li className="flex items-center gap-3"><span className="text-lg">🔗</span> Cross-references and commentary, one click away</li>
            <li className="flex items-center gap-3"><span className="text-lg">🎙</span> Turn your notes into a podcast-ready script</li>
            <li className="flex items-center gap-3"><span className="text-lg">🔒</span> Your studies stay private to your account, with optional 2FA</li>
          </ul>
          <blockquote className="mt-8 border-l-2 border-slate-700 pl-4 text-sm italic text-slate-400">
            "Make every effort to present yourself approved to God, an unashamed workman who accurately
            handles the word of truth."
            <footer className="mt-1 not-italic text-slate-500">— 2 Timothy 2:15 (BSB)</footer>
          </blockquote>
        </div>

        {/* Sign in / register form */}
        <div className="flex justify-center lg:justify-start">
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white p-8 shadow-panel">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400 lg:hidden">Bible Study Project</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            {authMode === 'login' ? 'Sign in' : 'Create an account'}
          </h1>
          <form onSubmit={submitAuth} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={authForm.email}
                onChange={(e) => setAuthForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                type="password"
                required
                minLength={8}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                value={authForm.password}
                onChange={(e) => setAuthForm((f) => ({ ...f, password: e.target.value }))}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>
            {authError && <p className="text-sm text-rose-600">{authError}</p>}
            <button
              type="submit"
              disabled={authBusy}
              className="w-full rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {authBusy ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setAuthMode((m) => (m === 'login' ? 'register' : 'login'));
              setAuthError('');
            }}
            className="mt-4 w-full text-center text-sm text-slate-500 underline hover:text-slate-700"
          >
            {authMode === 'login' ? "Need an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
