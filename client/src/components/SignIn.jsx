import { useState } from 'react';
import { api } from '../api.js';

// First screen: enter a display name -> POST /api/auth/session -> { token, user }.
// The parent stores the session and brings up the board.
export default function SignIn({ onSignedIn }) {
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    setSubmitting(true);
    setError('');
    try {
      const session = await api.createSession(name);
      onSignedIn(session);
    } catch (err) {
      setError(err.message || 'Could not sign in. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">Cohort Pulse Board</h1>
          <p className="text-sm text-slate-400">Pick a name to join the rooms.</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <label className="mb-2 block text-sm font-medium text-slate-300" htmlFor="displayName">
            Display name
          </label>
          <input
            id="displayName"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500"
            placeholder="e.g. Neeti"
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !displayName.trim()}
            className="mt-4 w-full rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}
