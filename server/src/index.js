import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { connectDb } from './db.js';
import { createSocketServer } from './socket.js';
import { pulsesRouter } from './routes/pulses.js';
import { roomsRouter } from './routes/rooms.js';
import { authRouter } from './routes/auth.js';
import { requireAuth } from './middleware/requireAuth.js';
import { globalLimiter, authLimiter, writeLimiter, writeOnly } from './middleware/rateLimits.js';
import { ensureLobby } from './seed.js';

const PORT = process.env.PORT || 3001;

// Allowed origins: CLIENT_ORIGIN (comma-separated) plus the local dev client.
const origins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
origins.push('http://localhost:5173');

async function start() {
  await connectDb(process.env.MONGODB_URI);
  await ensureLobby();

  const app = express();
  // Render runs behind a proxy — trust the first hop so req.ip is the real client
  // IP (required for per-IP rate limiting to work correctly).
  app.set('trust proxy', 1);
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '16kb' })); // pulses are tiny; cap the body size

  // Health check — keep this working through every checkpoint (NOT rate-limited so
  // warming/monitoring pings always succeed).
  app.get('/health', (req, res) => res.json({ ok: true }));

  const server = http.createServer(app);
  const io = await createSocketServer(server, origins);

  // Coarse per-IP flood backstop on the whole API.
  app.use('/api', globalLimiter);

  // Public auth endpoint (issues tokens) — mounted before the auth gate, with a
  // per-IP limiter to stop endless identity-minting.
  app.use('/api/auth', authLimiter, authRouter());

  // Everything else under /api requires a valid Bearer token (contract §2/§3).
  app.use('/api', requireAuth);

  // Per-user write limiter (the anti-loop guard) on mutating routes; reads pass through.
  app.use('/api/pulses', writeOnly(writeLimiter), pulsesRouter(io));
  app.use('/api/rooms', writeOnly(writeLimiter), roomsRouter(io));

  server.listen(PORT, () => console.log(`server listening on :${PORT}`));
}

start().catch((err) => {
  console.error('failed to start server', err);
  process.exit(1);
});
