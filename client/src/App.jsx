import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api.js';
import { loadSession, saveSession, clearSession } from './auth.js';
import { connectSocket, getSocket, disconnectSocket } from './socket.js';
import SignIn from './components/SignIn.jsx';
import RoomSwitcher from './components/RoomSwitcher.jsx';
import MemberList from './components/MemberList.jsx';
import PulseForm from './components/PulseForm.jsx';
import PulseCard from './components/PulseCard.jsx';

// Pinned first, then newest. Mirrors GET /rooms/:slug/pulses ordering (§3) so live
// inserts land consistently with REST history.
function sortPulses(list) {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export default function App() {
  const [session, setSession] = useState(() => loadSession());
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [pulses, setPulses] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState('');

  const token = session?.token;
  const user = session?.user;

  function signOut() {
    disconnectSocket();
    clearSession();
    setSession(null);
    setRooms([]);
    setCurrentRoom(null);
    setPulses([]);
    setMembers([]);
    setMemberCount(0);
  }

  // 401 anywhere (e.g. expired/invalid token) -> bounce to sign-in.
  const handleApiError = useCallback((err) => {
    if (err instanceof ApiError && err.status === 401) {
      signOut();
      return;
    }
    throw err;
  }, []);

  // --- Connect the socket once per session (lazily, after sign-in) ---------------
  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);

    function onConnectError(err) {
      // Rejected handshake (e.g. expired token) -> back to sign-in.
      if (/auth|token|unauthor|jwt/i.test(err?.message || '')) {
        signOut();
      } else {
        setError('Realtime connection error — retrying…');
      }
    }
    socket.on('connect_error', onConnectError);
    return () => {
      socket.off('connect_error', onConnectError);
    };
  }, [token]);

  // --- Load the room list after sign-in ------------------------------------------
  useEffect(() => {
    if (!token) return;
    api
      .listRooms(token)
      .then(setRooms)
      .catch((err) => {
        try {
          handleApiError(err);
        } catch {
          setError(err.message || 'Could not load rooms.');
        }
      });
  }, [token, handleApiError]);

  // --- Subscribe to room-scoped socket events for currentRoom --------------------
  // The full set of listeners is attached when currentRoom changes and torn down (with
  // a room:leave) before the next room's listeners go up. This is the room-switch
  // teardown the contract §6 calls for.
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !currentRoom) return undefined;
    const { slug } = currentRoom;

    function onPulseNew(pulse) {
      // Broadcasts are already scoped to room:<slug> (§4); dedupe by _id in case our
      // own POST response raced the socket echo.
      setPulses((prev) => sortPulses([pulse, ...prev.filter((p) => p._id !== pulse._id)]));
    }
    function onPulseDeleted({ id }) {
      setPulses((prev) => prev.filter((p) => p._id !== id));
    }
    function onPulsePinned(pulse) {
      setPulses((prev) =>
        sortPulses(prev.map((p) => (p._id === pulse._id ? pulse : p)))
      );
    }
    function onPresence({ members: list, count }) {
      setMembers(list ?? []);
      setMemberCount(count ?? (list ? list.length : 0));
    }
    function onModeration(payload) {
      // A mute/remove happened. Surface it; presence:members follows for removals.
      if (payload?.targetUserId === user.userId) {
        setError(
          payload.action === 'remove'
            ? 'You were removed from this room by a moderator.'
            : 'You were muted by a moderator.'
        );
      }
    }

    socket.on('pulse:new', onPulseNew);
    socket.on('pulse:deleted', onPulseDeleted);
    socket.on('pulse:pinned', onPulsePinned);
    socket.on('presence:members', onPresence);
    socket.on('moderation:applied', onModeration);

    // Join over the socket for live + presence (history was fetched in selectRoom).
    socket.emit('room:join', { slug });

    return () => {
      socket.emit('room:leave', { slug });
      socket.off('pulse:new', onPulseNew);
      socket.off('pulse:deleted', onPulseDeleted);
      socket.off('pulse:pinned', onPulsePinned);
      socket.off('presence:members', onPresence);
      socket.off('moderation:applied', onModeration);
    };
  }, [currentRoom, user]);

  // --- Switching into a room: fetch history, then the effect above joins live ----
  const selectRoom = useCallback(
    async (room) => {
      setError('');
      setMembers([]);
      setMemberCount(0);
      try {
        const history = await api.getPulses(token, room.slug);
        setPulses(sortPulses(history));
        setCurrentRoom(room);
      } catch (err) {
        try {
          handleApiError(err);
        } catch {
          setError(err.message || 'Could not open room.');
        }
      }
    },
    [token, handleApiError]
  );

  const upsertRoom = useCallback((room) => {
    setRooms((prev) => {
      const others = prev.filter((r) => r.slug !== room.slug);
      return [...others, room];
    });
  }, []);

  const createRoom = useCallback(
    async (payload) => {
      const room = await api.createRoom(token, payload).catch((err) => {
        handleApiError(err);
        throw err;
      });
      upsertRoom(room);
      await selectRoom(room);
    },
    [token, handleApiError, upsertRoom, selectRoom]
  );

  // Join (public, or private with a code). Prompt for a code if the room is private.
  const joinRoom = useCallback(
    async ({ slug, isPrivate }) => {
      let accessCode;
      if (isPrivate) {
        accessCode = window.prompt('This room is private. Enter the access code:') ?? '';
        if (!accessCode) return;
      }
      try {
        const { room } = await api.joinRoom(token, slug, accessCode);
        upsertRoom(room);
        await selectRoom(room);
      } catch (err) {
        // 403 on a private room we didn't know was private (or wrong code) -> retry with prompt.
        if (err instanceof ApiError && err.status === 403 && !isPrivate) {
          const code = window.prompt('This room is private. Enter the access code:') ?? '';
          if (!code) return;
          const { room } = await api.joinRoom(token, slug, code);
          upsertRoom(room);
          await selectRoom(room);
          return;
        }
        try {
          handleApiError(err);
        } catch {
          throw err;
        }
      }
    },
    [token, handleApiError, upsertRoom, selectRoom]
  );

  // --- Board actions --------------------------------------------------------------
  const postPulse = useCallback(
    async ({ type, text }) => {
      if (!currentRoom) return;
      await api.postPulse(token, currentRoom.slug, { type, text }).catch((err) => {
        handleApiError(err);
        throw err;
      });
      // pulse:new over the socket adds it to the board.
    },
    [token, currentRoom, handleApiError]
  );

  const pinPulse = useCallback(
    async (id, pinned) => {
      try {
        await api.pinPulse(token, currentRoom.slug, id, pinned);
      } catch (err) {
        try {
          handleApiError(err);
        } catch {
          setError(err.message || 'Could not update pin.');
        }
      }
    },
    [token, currentRoom, handleApiError]
  );

  const deletePulse = useCallback(
    async (id) => {
      try {
        await api.deletePulse(token, currentRoom.slug, id);
      } catch (err) {
        try {
          handleApiError(err);
        } catch {
          setError(err.message || 'Could not delete pulse.');
        }
      }
    },
    [token, currentRoom, handleApiError]
  );

  const muteMember = useCallback(
    async (targetUserId) => {
      try {
        await api.moderate(token, currentRoom.slug, { action: 'mute', targetUserId });
      } catch (err) {
        try {
          handleApiError(err);
        } catch {
          setError(err.message || 'Could not moderate member.');
        }
      }
    },
    [token, currentRoom, handleApiError]
  );

  if (!session) {
    return (
      <SignIn
        onSignedIn={(s) => {
          saveSession(s);
          setSession(s);
        }}
      />
    );
  }

  // UI hint only — server still enforces (§6).
  const canModerate =
    !!currentRoom &&
    (user.userId === currentRoom.ownerId ||
      (currentRoom.moderatorIds ?? []).includes(user.userId));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cohort Pulse Board</h1>
            <p className="text-sm text-slate-400">
              {currentRoom ? `#${currentRoom.slug}` : 'Pick a room to start.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{user.displayName}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr_16rem]">
          <RoomSwitcher
            rooms={rooms}
            currentRoom={currentRoom}
            user={user}
            onSelect={selectRoom}
            onCreate={createRoom}
            onJoin={joinRoom}
          />

          <main className="flex flex-col gap-4">
            {currentRoom ? (
              <>
                <PulseForm onSubmit={postPulse} />
                <div className="flex flex-col gap-3">
                  {pulses.length === 0 && (
                    <p className="text-center text-slate-500">No pulses yet — be the first.</p>
                  )}
                  {pulses.map((p) => (
                    <PulseCard
                      key={p._id}
                      pulse={p}
                      canModerate={canModerate}
                      onPin={pinPulse}
                      onDelete={deletePulse}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-500">
                Select or create a room from the left to see its live board.
              </div>
            )}
          </main>

          {currentRoom && (
            <MemberList
              members={members}
              count={memberCount}
              user={user}
              room={currentRoom}
              canModerate={canModerate}
              onMute={muteMember}
            />
          )}
        </div>
      </div>
    </div>
  );
}
