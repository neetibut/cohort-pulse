import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { connectDb } from './db.js';
import { createSocketServer } from './socket.js';
import { pulsesRouter } from './routes/pulses.js';
import { roomsRouter } from './routes/rooms.js';
import { ensureLobby } from './seed.js';

const PORT = process.env.PORT || 3001;

// Allowed origins: CLIENT_ORIGIN (comma-separated) plus the local dev client.
const origins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
origins.push('http://localhost:5173');

async function start() {
  const app = express();
  app.use(cors({ origin: origins }));
  app.use(express.json());

  // Health check — keep this working through every checkpoint. It is NOT gated on the
  // database, so pre-flight and uptime pings stay green even while Mongo connects.
  app.get('/health', (req, res) => res.json({ ok: true }));

  const server = http.createServer(app);
  const io = await createSocketServer(server, origins);

  app.use('/api/pulses', pulsesRouter(io));
  app.use('/api/rooms', roomsRouter(io));

  // Start listening FIRST so /health is up immediately, THEN connect to Mongo. If
  // Atlas is unreachable we log a clear hint and keep serving /health rather than
  // crashing silently — data routes fail until the DB is fixed, but you can see why.
  server.listen(PORT, () => console.log(`server listening on :${PORT}`));
  connectDb(process.env.MONGODB_URI)
    .then(() => ensureLobby())
    .catch(() => {
      console.error('server is up (/health ok) but the database is NOT connected — fix the above and restart.');
    });
}

start().catch((err) => {
  console.error('failed to start server', err);
  process.exit(1);
});
