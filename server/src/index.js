import 'dotenv/config';
import 'express-async-errors'; // routes async rejections to the error handler below
import http from 'http';
import express from 'express';
import helmet from 'helmet';
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
  const app = express();
  // Render runs behind a proxy — trust the first hop so req.ip is the real client
  // IP (required for per-IP rate limiting to work correctly).
  app.set('trust proxy', 1);
  // Security headers. cross-origin resource policy is relaxed because the frontend
  // (Vercel) and API (Render) are different origins.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '16kb' })); // pulses are tiny; cap the body size

  // Health check — keep this working through every checkpoint. NOT rate-limited (so
  // warming/monitoring pings always succeed) and NOT gated on the database (so it stays
  // green even while Mongo connects, mounted before the DB connect below).
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

  // Central error handler: async route rejections (via express-async-errors) and any
  // next(err) land here as JSON instead of a hung request or an HTML stack trace.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = Number.isInteger(err?.status) ? err.status : 500;
    if (status >= 500) console.error('unhandled error:', err?.stack || err);
    res.status(status).json({ error: status >= 500 ? 'internal server error' : (err.message || 'bad request') });
  });

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
