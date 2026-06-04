import { useState } from 'react';

const TYPES = [
  { value: 'stuck', label: 'Stuck' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'question', label: 'Question' },
  { value: 'idea', label: 'Idea' },
];

// v2: no name field — the author is the signed-in user (carried by the token). The
// parent posts to the current room (POST /rooms/:slug/pulses) and the new pulse arrives
// back over the socket as pulse:new, so we don't append locally.
export default function PulseForm({ onSubmit }) {
  const [type, setType] = useState('shipped');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await onSubmit({ type, text: text.trim() });
      setText('');
    } catch (err) {
      setError(err.message || 'Could not post.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500"
          placeholder="What's your pulse?"
          maxLength={280}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          Post
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </form>
  );
}
