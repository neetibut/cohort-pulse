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

export default function PulseCard({ pulse }) {
  const style = TYPE_STYLES[pulse.type] ?? 'border-slate-600 bg-slate-800 text-slate-300';
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-100">{pulse.author}</span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${style}`}>
          {TYPE_LABEL[pulse.type] ?? pulse.type}
        </span>
      </div>
      <p className="mt-2 break-words text-slate-200">{pulse.text}</p>
      <time className="mt-2 block text-xs text-slate-500">
        {pulse.createdAt ? new Date(pulse.createdAt).toLocaleTimeString() : ''}
      </time>
    </div>
  );
}
