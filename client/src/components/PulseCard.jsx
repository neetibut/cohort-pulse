// v2 Pulse: { authorName, type, text, pinned, createdAt }. Keeps the v1 per-type
// color-coding. When canModerate, shows pin/unpin + delete controls (the server still
// authorizes — these are a UI hint per §6).
const TYPE_STYLES = {
  stuck: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
  shipped: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  question: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  idea: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
};

const TYPE_LABEL = {
  stuck: 'Stuck',
  shipped: 'Shipped',
  question: 'Question',
  idea: 'Idea',
};

export default function PulseCard({ pulse, canModerate, onPin, onDelete }) {
  const style = TYPE_STYLES[pulse.type] ?? 'border-slate-600 bg-slate-800 text-slate-300';
  return (
    <div
      className={`rounded-xl border bg-slate-900 p-4 ${
        pulse.pinned ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-slate-100">
          {pulse.pinned && <span className="text-xs text-indigo-300" title="Pinned">📌</span>}
          {pulse.authorName}
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
          {TYPE_LABEL[pulse.type] ?? pulse.type}
        </span>
      </div>
      <p className="mt-2 break-words text-slate-200">{pulse.text}</p>
      <div className="mt-2 flex items-center justify-between">
        <time className="block text-xs text-slate-500">
          {pulse.createdAt ? new Date(pulse.createdAt).toLocaleTimeString() : ''}
        </time>
        {canModerate && (
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onPin(pulse._id, !pulse.pinned)}
              className="rounded-md px-2 py-0.5 font-medium text-indigo-300 hover:bg-indigo-500/10"
            >
              {pulse.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              onClick={() => onDelete(pulse._id)}
              className="rounded-md px-2 py-0.5 font-medium text-rose-400 hover:bg-rose-500/10"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
