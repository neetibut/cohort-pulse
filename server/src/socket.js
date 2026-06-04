import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

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

  // fetchSockets() counts across the whole cluster when the redis adapter is on,
  // so presence stays correct even with several backend instances.
  async function emitPresence() {
    const sockets = await io.fetchSockets();
    io.emit('presence:count', sockets.length);
  }

  io.on('connection', (socket) => {
    emitPresence();
    socket.on('disconnect', () => emitPresence());
  });

  return io;
}
