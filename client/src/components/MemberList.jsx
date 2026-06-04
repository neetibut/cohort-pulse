// Live presence panel, rendered from presence:members { members, count }.
// Members are { userId, displayName } and already deduped by userId server-side (§4).
// Owner/moderators can mute a member; the mute control shows only when canModerate
// and never targets the current user.
export default function MemberList({ members, count, user, room, canModerate, onMute }) {
  const ownerId = room?.ownerId;
  const moderatorIds = room?.moderatorIds ?? [];

  function roleLabel(userId) {
    if (userId === ownerId) return 'owner';
    if (moderatorIds.includes(userId)) return 'mod';
    return null;
  }

  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Online · {count}
      </h2>
      <ul className="flex flex-col gap-1">
        {members.length === 0 && <li className="text-sm text-slate-500">No one here yet.</li>}
        {members.map((m) => {
          const role = roleLabel(m.userId);
          const isSelf = m.userId === user.userId;
          return (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              <span className="flex items-center gap-2 truncate">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                <span className="truncate">
                  {m.displayName}
                  {isSelf && <span className="text-slate-500"> (you)</span>}
                </span>
                {role && (
                  <span className="rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-300">
                    {role}
                  </span>
                )}
              </span>
              {canModerate && !isSelf && (
                <button
                  type="button"
                  onClick={() => onMute(m.userId)}
                  className="ml-2 rounded-md px-1.5 py-0.5 text-xs font-medium text-rose-400 hover:bg-rose-500/10"
                  title="Mute this member"
                >
                  mute
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
