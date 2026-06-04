import { useState } from 'react';
import { API_URL } from '../config.js';

const TYPES = [
  { value: 'stuck', label: 'Stuck' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'question', label: 'Question' },
  { value: 'idea', label: 'Idea' },
];

export default function PulseForm() {
  const [author, setAuthor] = useState('');
  const [type, setType] = useState('shipped');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/api/pulses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ author, type, text }),
      });
      setText(''); // the new pulse arrives via the socket — no local append needed
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 sm:w-40"
          placeholder="Your name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
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
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </form>
  );
}
