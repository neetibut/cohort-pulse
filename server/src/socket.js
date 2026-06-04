import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { verifyToken } from './auth.js';
import { Room } from './models/Room.js';

export async function createSocketServer(httpServer, origins) {
  const io = new Server(httpServer, {
    cors: { origin: origins, methods: ['GET', 'POST'] },
  });

  // Redis adapter — the production-correct way to fan out events across multiple
  // backend instances. Optional locally: skipped when REDIS_URL is unset so the
  // server still runs in single-process local mode.
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('socket.io redis adapter enabled');
  } else {
    console.log('REDIS_URL not set — socket.io running without redis adapter (local mode)');
  }

  // Handshake auth (contract §2/§4): verify the JWT sent as io(URL, { auth: { token } }).
  // On failure the client receives `connect_error`; on success we stash identity on
  // socket.data.user = { userId, displayName } (the token-payload shape).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const { userId, displayName } = verifyToken(token);
      socket.data.user = { userId, displayName };
      return next();
    } catch {
      return next(new Error('unauthorized'));
    }
  });

  // Per-room presence (contract §4/§5): the members of `room:<slug>` are the identities
  // of the sockets currently in it, deduped by userId (two tabs of one person = one
  // member). fetchSockets() is adapter-aware, so this is correct across instances.
  async function emitPresence(slug) {
    const sockets = await io.in(`room:${slug}`).fetchSockets();
    const byUserId = new Map();
    for (const s of sockets) {
      const user = s.data?.user;
      if (!user) continue;
      // First socket wins; later tabs of the same user collapse onto it.
      if (!byUserId.has(user.userId)) {
        byUserId.set(user.userId, { userId: user.userId, displayName: user.displayName });
      }
    }
    const members = [...byUserId.values()];
    io.to(`room:${slug}`).emit('presence:members', { slug, members, count: members.length });
  }

  // Which `room:*` rooms is this socket currently in? (Excludes the socket's own id room.)
  function joinedRoomSlugs(socket) {
    const slugs = [];
    for (const name of socket.rooms) {
      if (name.startsWith('room:')) slugs.push(name.slice('room:'.length));
    }
    return slugs;
  }

  io.on('connection', (socket) => {
    // room:join { slug } — validate membership, switch rooms (one at a time per §4),
    // acknowledge with room:joined, then broadcast presence for the room.
    socket.on('room:join', async ({ slug } = {}) => {
      if (!slug) {
        return socket.emit('room:error', { error: 'slug is required' });
      }
      const normalized = String(slug).toLowerCase();
      let room;
      try {
        room = await Room.findOne({ slug: normalized });
      } catch {
        return socket.emit('room:error', { slug: normalized, error: 'lookup failed' });
      }
      if (!room) {
        return socket.emit('room:error', { slug: normalized, error: 'room not found' });
      }
      if (!room.members.some((m) => m.equals(socket.data.user.userId))) {
        return socket.emit('room:error', { slug: normalized, error: 'not a member of this room' });
      }

      // Leave any previously-joined room first (clients join one room at a time).
      const previous = joinedRoomSlugs(socket).filter((s) => s !== normalized);
      for (const prev of previous) {
        socket.leave(`room:${prev}`);
      }

      socket.join(`room:${normalized}`);
      socket.emit('room:joined', { slug: normalized });

      // Presence for the room just joined, plus any room(s) just left.
      await emitPresence(normalized);
      for (const prev of previous) {
        await emitPresence(prev);
      }
    });

    // room:leave { slug } — leave the room and refresh its presence.
    socket.on('room:leave', async ({ slug } = {}) => {
      if (!slug) return;
      const normalized = String(slug).toLowerCase();
      socket.leave(`room:${normalized}`);
      await emitPresence(normalized);
    });

    // On disconnect, refresh presence for every room the socket was in. socket.rooms
    // is still populated synchronously in the 'disconnecting' handler.
    socket.on('disconnecting', () => {
      const slugs = joinedRoomSlugs(socket);
      // Defer to the next tick so fetchSockets() no longer counts this socket.
      socket.on('disconnect', () => {
        for (const slug of slugs) emitPresence(slug);
      });
    });
  });

  return io;
}
