export default function PresenceBadge({ count }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">
      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      {count} online
    </span>
  );
}
