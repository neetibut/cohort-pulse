import { useState } from 'react';

// Sidebar: lists rooms the caller can see (GET /rooms), lets them switch, create a
// room, or join one by slug. Private rooms prompt for an access code. Selecting a room
// the caller hasn't joined yet routes through onJoin (POST /rooms/:slug/join); already
// known rooms route through onSelect. The parent owns the actual REST calls.
export default function RoomSwitcher({ rooms, currentRoom, user, onSelect, onCreate, onJoin }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [joinSlug, setJoinSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onCreate({
        name: name.trim(),
        isPrivate,
        accessCode: isPrivate ? accessCode : undefined,
      });
      setName('');
      setIsPrivate(false);
      setAccessCode('');
      setShowCreate(false);
    } catch (err) {
      setError(err.message || 'Could not create room.');
    } finally {
      setBusy(false);
    }
  }

  async function handleJoinBySlug(e) {
    e.preventDefault();
    const slug = joinSlug.trim().toLowerCase();
    if (!slug) return;
    setBusy(true);
    setError('');
    try {
      await onJoin({ slug });
      setJoinSlug('');
    } catch (err) {
      setError(err.message || 'Could not join room.');
    } finally {
      setBusy(false);
    }
  }

  function handleRoomClick(room) {
    setError('');
    // Already a member -> just switch. Otherwise go through join (server may need a code).
    const joined = room.members?.includes(user.userId);
    if (joined) {
      onSelect(room);
    } else {
      Promise.resolve(onJoin({ slug: room.slug, isPrivate: room.isPrivate })).catch((err) =>
        setError(err.message || 'Could not join room.')
      );
    }
  }

  return (
    <aside className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Rooms</h2>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-indigo-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-400"
        >
          {showCreate ? 'Cancel' : '+ New'}
        </button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {showCreate && (
        <form onSubmit={handleCreate} className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3">
          <input
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
            placeholder="Room name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private (requires access code)
          </label>
          {isPrivate && (
            <input
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
              placeholder="Access code"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
            />
          )}
          <button
            type="submit"
            disabled={busy || !name.trim() || (isPrivate && !accessCode.trim())}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            Create room
          </button>
        </form>
      )}

      <ul className="flex flex-col gap-1">
        {rooms.length === 0 && <li className="text-sm text-slate-500">No rooms yet.</li>}
        {rooms.map((room) => {
          const active = currentRoom?.slug === room.slug;
          return (
            <li key={room.slug}>
              <button
                type="button"
                onClick={() => handleRoomClick(room)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  active
                    ? 'bg-indigo-500/20 text-indigo-200'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="truncate">{room.name}</span>
                {room.isPrivate && <span className="ml-2 text-xs text-slate-500">🔒</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleJoinBySlug} className="flex flex-col gap-2 border-t border-slate-800 pt-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Join by slug
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
            placeholder="e.g. cohort-7"
            value={joinSlug}
            onChange={(e) => setJoinSlug(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !joinSlug.trim()}
            className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-600 disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </form>
    </aside>
  );
}
